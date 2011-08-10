package eu.interedition.text.rdbms;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.collect.Multimap;
import com.google.common.collect.Sets;
import eu.interedition.text.Annotation;
import eu.interedition.text.AnnotationLink;
import eu.interedition.text.QName;
import eu.interedition.text.query.Criterion;
import eu.interedition.text.util.AbstractAnnotationLinkRepository;
import eu.interedition.text.util.SQL;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Required;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.jdbc.core.simple.SimpleJdbcTemplate;
import org.springframework.jdbc.support.incrementer.DataFieldMaxValueIncrementer;

import javax.sql.DataSource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

import static eu.interedition.text.rdbms.RelationalAnnotationRepository.mapAnnotationFrom;
import static eu.interedition.text.rdbms.RelationalAnnotationRepository.selectAnnotationFrom;
import static eu.interedition.text.rdbms.RelationalQNameRepository.mapNameFrom;
import static eu.interedition.text.rdbms.RelationalQNameRepository.selectNameFrom;
import static eu.interedition.text.rdbms.RelationalTextRepository.selectTextFrom;

/**
 * @author <a href="http://gregor.middell.net/" title="Homepage">Gregor Middell</a>
 */
public class RelationalAnnotationLinkRepository extends AbstractAnnotationLinkRepository implements InitializingBean {
  private DataSource dataSource;
  private DataFieldMaxValueIncrementerFactory incrementerFactory;
  private RelationalQNameRepository nameRepository;
  private RelationalQueryCriteriaTranslator queryCriteriaTranslator;

  private int batchSize = 10000;

  private SimpleJdbcTemplate jt;
  private SimpleJdbcInsert annotationLinkInsert;
  private SimpleJdbcInsert annotationLinkTargetInsert;
  private SimpleJdbcInsert annotationLinkDataInsert;
  private DataFieldMaxValueIncrementer annotationLinkIdIncrementer;

  public Map<AnnotationLink, Set<Annotation>> create(Multimap<QName, Set<Annotation>> links) {
    final Map<QName, Long> nameIdIndex = Maps.newHashMap();
    for (QName n : nameRepository.get(links.keySet())) {
      nameIdIndex.put(n, ((RelationalQName) n).getId());
    }

    final Map<AnnotationLink, Set<Annotation>> created = Maps.newLinkedHashMap();
    final List<SqlParameterSource> linkBatch = Lists.newArrayList();
    final List<SqlParameterSource> targetBatch = Lists.newArrayList();

    for (Map.Entry<QName, Set<Annotation>> link : links.entries()) {
      final QName linkName = link.getKey();
      final Set<Annotation> targets = link.getValue();

      final Long nameId = nameIdIndex.get(linkName);
      final long linkId = annotationLinkIdIncrementer.nextLongValue();

      linkBatch.add(new MapSqlParameterSource()
              .addValue("id", linkId)
              .addValue("name", nameId));

      for (Annotation target : targets) {
          targetBatch.add(new MapSqlParameterSource()
                  .addValue("link", linkId)
                  .addValue("target", ((RelationalAnnotation) target).getId()));
      }

      final RelationalAnnotationLink rt = new RelationalAnnotationLink(linkId, new RelationalQName(nameId, linkName));
      created.put(rt, targets);
    }

    annotationLinkInsert.executeBatch(linkBatch.toArray(new SqlParameterSource[linkBatch.size()]));
    annotationLinkTargetInsert.executeBatch(targetBatch.toArray(new SqlParameterSource[targetBatch.size()]));

    return created;
  }

  public void delete(Iterable<AnnotationLink> links) {
    final List<Long> linkIds = Lists.newArrayList();
    for (AnnotationLink a : links) {
      linkIds.add(((RelationalAnnotationLink)a).getId());
    }
    if (linkIds.isEmpty()) {
      return;
    }
    final StringBuilder sql = new StringBuilder("delete from text_annotation_link where id in (");
    for (Iterator<Long> idIt = linkIds.iterator(); idIt.hasNext(); ) {
      sql.append("?").append(idIt.hasNext() ? ", " : "");
    }
    sql.append(")");
    jt.update(sql.toString(), linkIds.toArray(new Object[linkIds.size()]));
  }

  public void delete(Criterion criterion) {
    final ArrayList<Object> parameters = new ArrayList<Object>();
    final List<Object[]> batchParameters = Lists.newArrayListWithCapacity(batchSize);
    jt.query(sql("select distinct al.id as al_id", parameters, criterion).toString(), new RowMapper<Void>() {
      public Void mapRow(ResultSet rs, int rowNum) throws SQLException {
        batchParameters.add(new Object[]{rs.getInt("al_id")});

        if (rs.isLast() || (batchParameters.size() % batchSize) == 0) {
          jt.batchUpdate("delete from text_annotation_link where id = ?", batchParameters);
          batchParameters.clear();
        }

        return null;
      }
    }, parameters.toArray(new Object[parameters.size()]));
  }

  public void cleanup() {
    StringBuilder sql = new StringBuilder();
    sql.append("select distinct al.id as link_id");
    sql.append(" from text_annotation_link al");
    sql.append(" left join text_annotation_link_target alt on al.id = alt.link");
    sql.append(" where alt.target is null");

    final List<SqlParameterSource> ids = Lists.newArrayList();
    jt.query(sql.toString(), new RowMapper<Void>() {
      public Void mapRow(ResultSet rs, int rowNum) throws SQLException {
        ids.add(new MapSqlParameterSource().addValue("id", rs.getLong("link_id")));
        return null;
      }
    });

    if (!ids.isEmpty()) {
      jt.batchUpdate("delete from text_annotation_link where id = :id", ids.toArray(new SqlParameterSource[ids.size()]));
    }
  }

  public Map<AnnotationLink, Set<Annotation>> find(Criterion criterion) {
    final List<Long> linkIds = Lists.newArrayList();

    final List<Object> ps = new ArrayList<Object>();
    jt.query(sql("select distinct al.id as al_id", ps, criterion).toString(), new RowMapper<Void>() {
      public Void mapRow(ResultSet rs, int rowNum) throws SQLException {
        linkIds.add(rs.getLong("al_id"));
        return null;
      }
    }, ps.toArray(new Object[ps.size()]));

    if (linkIds.isEmpty()) {
      return Collections.emptyMap();
    }

    final String dataSelect = new StringBuilder("select ")
            .append("al.id as al_id, ")
            .append(selectAnnotationFrom("a")).append(", ")
            .append(selectTextFrom("t")).append(", ")
            .append(selectNameFrom("aln")).append(", ")
            .append(selectNameFrom("an")).toString();

    final StringBuilder where = new StringBuilder("al.id in (");
    for (Iterator<Long> linkIdIt = linkIds.iterator(); linkIdIt.hasNext(); ) {
      linkIdIt.next();
      where.append("?").append(linkIdIt.hasNext() ? ", " : "");
    }
    where.append(")");

    final Map<AnnotationLink, Set<Annotation>> annotationLinks = new HashMap<AnnotationLink, Set<Annotation>>();
    jt.query(sql(dataSelect, where.toString()).append(" order by al.id, t.id, an.id, a.id").toString(), new RowMapper<Void>() {
      private RelationalAnnotationLink currentLink;
      private RelationalText currentText;
      private RelationalQName currentAnnotationName;

      public Void mapRow(ResultSet rs, int rowNum) throws SQLException {
        final int annotationLinkId = rs.getInt("al_id");
        final int textId = rs.getInt("t_id");
        final int annotationNameId = rs.getInt("an_id");

        if (currentLink == null || currentLink.getId() != annotationLinkId) {
          currentLink = new RelationalAnnotationLink(annotationLinkId, mapNameFrom(rs, "aln"));
        }
        if (currentText == null || currentText.getId() != textId) {
          currentText = RelationalTextRepository.mapTextFrom(rs, "t");
        }
        if (currentAnnotationName == null || currentAnnotationName.getId() != annotationNameId) {
          currentAnnotationName = mapNameFrom(rs, "an");
        }

        Set<Annotation> members = annotationLinks.get(currentLink);
        if (members == null) {
          annotationLinks.put(currentLink, members = new TreeSet<Annotation>());
        }
        members.add(mapAnnotationFrom(rs, currentText, currentAnnotationName, "a"));

        return null;
      }

    }, linkIds.toArray(new Object[linkIds.size()]));

    return annotationLinks;
  }

  public Map<AnnotationLink, Map<QName, String>> get(Iterable<AnnotationLink> links, Set<QName> names) {
    final Map<Long, RelationalAnnotationLink> linkIds = Maps.newHashMap();
    for (AnnotationLink link : links) {
      RelationalAnnotationLink rl = (RelationalAnnotationLink)link;
      linkIds.put(rl.getId(), rl);
    }

    if (linkIds.isEmpty()) {
      return Collections.emptyMap();
    }

    final List<Object> ps = Lists.<Object>newArrayList(linkIds.keySet());
    final StringBuilder sql = new StringBuilder("select  ");
    sql.append(selectDataFrom("d")).append(", ");
    sql.append(RelationalQNameRepository.selectNameFrom("n")).append(", ");
    sql.append("d.link as d_link");
    sql.append(" from text_annotation_link_data d join text_qname n on d.name = n.id where d.link in (");
    for (Iterator<Long> linkIdIt = linkIds.keySet().iterator(); linkIdIt.hasNext(); ) {
      sql.append("?").append(linkIdIt.hasNext() ? ", " : "");
    }
    sql.append(")");

    if (!names.isEmpty()) {
      sql.append(" and d.name in (");
      for (Iterator<QName> nameIt = nameRepository.get(names).iterator(); nameIt.hasNext(); ) {
        ps.add(((RelationalQName)nameIt.next()).getId());
        sql.append("?").append(nameIt.hasNext() ? ", " : "");
      }
      sql.append(")");
    }

    sql.append(" order by d.link");

    final Map<AnnotationLink, Map<QName, String>> data = new HashMap<AnnotationLink, Map<QName, String>>();
    for (RelationalAnnotationLink link : linkIds.values()) {
      data.put(link, Maps.<QName, String>newHashMap());
    }

    final Map<Long, RelationalQName> nameCache = Maps.newHashMap();
    jt.query(sql.toString(), new RowMapper<Void>() {

      private RelationalAnnotationLink link;
      private Map<QName, String> dataMap;

      public Void mapRow(ResultSet rs, int rowNum) throws SQLException {
        final long linkId = rs.getLong("d_link");
        if (link == null || link.getId() != linkId) {
          link = linkIds.get(linkId);
          dataMap = data.get(link);
        }

        RelationalQName name = RelationalQNameRepository.mapNameFrom(rs, "n");
        if (nameCache.containsKey(name.getId())) {
          name = nameCache.get(name.getId());
        } else {
          nameCache.put(name.getId(), name);
        }

        dataMap.put(name, mapDataFrom(rs, "d"));

        return null;
      }
    }, ps);

    return data;
  }

  public void set(Map<AnnotationLink, Map<QName, String>> data) {
    final Set<QName> names = Sets.newHashSet();
    for (Map<QName, String> dataEntry : data.values()) {
      for (QName name : dataEntry.keySet()) {
        names.add(name);
      }
    }
    final Map<QName, Long> nameIds = Maps.newHashMap();
    for (QName name : nameRepository.get(names)) {
      nameIds.put(name, ((RelationalQName)name).getId());
    }

    final List<SqlParameterSource> batchParams = new ArrayList<SqlParameterSource>(data.size());
    for (AnnotationLink link : data.keySet()) {
      final long linkId = ((RelationalAnnotationLink) link).getId();
      final Map<QName, String> linkData = data.get(link);
      for (Map.Entry<QName, String> dataEntry : linkData.entrySet()) {
        batchParams.add(new MapSqlParameterSource()
                .addValue("link", linkId)
                .addValue("name", nameIds.get(dataEntry.getKey()))
                .addValue("value", dataEntry.getValue()));
      }
    }

    if (!batchParams.isEmpty()) {
      annotationLinkDataInsert.executeBatch(batchParams.toArray(new SqlParameterSource[batchParams.size()]));
    }
  }

  public void unset(Map<AnnotationLink, Iterable<QName>> data) {
    final Set<QName> names = Sets.newHashSet();
    for (Iterable<QName> linkNames : data.values()) {
      for (QName name : linkNames) {
        names.add(name);
      }
    }

    final Map<QName, Long> nameIds = Maps.newHashMapWithExpectedSize(names.size());
    for (QName name : nameRepository.get(names)) {
      nameIds.put(name, ((RelationalQName)name).getId());
    }

    List<SqlParameterSource> batchPs = Lists.newArrayList();
    for (Map.Entry<AnnotationLink, Iterable<QName>> dataEntry : data.entrySet()) {
      long linkId = ((RelationalAnnotationLink) dataEntry.getKey()).getId();
      for (QName name : dataEntry.getValue()) {
        batchPs.add(new MapSqlParameterSource()
        .addValue("link", linkId)
        .addValue("name", nameIds.get(name)));
      }
    }

    jt.batchUpdate("delete from text_annotation_link_data where link = :link and name = :name", batchPs.toArray(new SqlParameterSource[batchPs.size()]));
  }

  @Required
  public void setDataSource(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  @Required
  public void setIncrementerFactory(DataFieldMaxValueIncrementerFactory incrementerFactory) {
    this.incrementerFactory = incrementerFactory;
  }

  @Required
  public void setNameRepository(RelationalQNameRepository nameRepository) {
    this.nameRepository = nameRepository;
  }

  @Required
  public void setQueryCriteriaTranslator(RelationalQueryCriteriaTranslator queryCriteriaTranslator) {
    this.queryCriteriaTranslator = queryCriteriaTranslator;
  }

  public void setBatchSize(int batchSize) {
    this.batchSize = batchSize;
  }

  public void afterPropertiesSet() throws Exception {
    this.jt = (dataSource == null ? null : new SimpleJdbcTemplate(dataSource));
    this.annotationLinkInsert = (jt == null ? null : new SimpleJdbcInsert(dataSource).withTableName("text_annotation_link"));
    this.annotationLinkTargetInsert = (jt == null ? null : new SimpleJdbcInsert(dataSource).withTableName("text_annotation_link_target"));
    this.annotationLinkDataInsert = new SimpleJdbcInsert(dataSource).withTableName("text_annotation_link_data");
    this.annotationLinkIdIncrementer = incrementerFactory.create("text_annotation_link");
  }

  private StringBuilder sql(String select, String where) {
    return from(new StringBuilder(select)).append(" where ").append(where);
  }

  private StringBuilder sql(String select, List<Object> ps, Criterion criterion) {
    return queryCriteriaTranslator.where(from(new StringBuilder(select)), criterion, ps);
  }

  private StringBuilder from(StringBuilder sql) {
    sql.append(" from text_annotation_link_target alt");
    sql.append(" join text_annotation_link al on alt.link = al.id");
    sql.append(" join text_qname aln on al.name = aln.id");
    sql.append(" join text_annotation a on alt.target = a.id");
    sql.append(" join text_qname an on a.name = an.id");
    sql.append(" join text_content t on a.text = t.id");
    return sql;
  }

  public static String selectDataFrom(String tableName) {
    return SQL.select(tableName, "value");
  }

  public static String mapDataFrom(ResultSet rs, String prefix) throws SQLException {
    return rs.getString(prefix + "_value");
  }
}

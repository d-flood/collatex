package eu.interedition.collatex2.web;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.io.Writer;
import java.net.HttpURLConnection;
import java.net.URL;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import net.sf.json.JSONArray;
import net.sf.json.JSONObject;

import org.apache.commons.lang.StringUtils;

/**
 * Servlet implementation class Collatex
 */
public class CollatexClient extends HttpServlet {
  private static final long serialVersionUID = 1L;

  /**
   * @see HttpServlet#HttpServlet()
   */
  public CollatexClient() {
    super();
    // TODO Auto-generated constructor stub
  }

  /**
   * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    // TODO Auto-generated method stub
    String text1 = request.getParameter("text1").toString();
    String text2 = request.getParameter("text2").toString();
    String text3 = request.getParameter("text3").toString();
    String text4 = request.getParameter("text4").toString();
    String text5 = request.getParameter("text5").toString();
    String text6 = request.getParameter("text6").toString();
    String outputType = request.getParameter("output_type").toString();
    String restService = request.getParameter("rest_service").toString();

    String jsonContent = createJson(text1, text2, text3, text4, text5, text6);

    URL server = new URL(restService);
    HttpURLConnection connection = (HttpURLConnection) server.openConnection();
    connection.setDoOutput(true);
    connection.setDoInput(true);
    connection.setUseCaches(false);
    connection.setRequestProperty("Content-Type", "application/json;charset=UTF-8;");
    connection.setRequestProperty("Accept", outputType);
    connection.setRequestMethod("POST");

    Writer writer = new OutputStreamWriter(connection.getOutputStream());
    writer.write(jsonContent);
    System.out.println("content sent: " + jsonContent);
    writer.flush();
    writer.close();

    BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
    response.setContentType(outputType);
    PrintWriter servletOutput = response.getWriter();

    String line = null;
    while (null != (line = reader.readLine())) {
      servletOutput.println(line);
    }
    reader.close();
    servletOutput.close();

  }

  static char baseId = Character.valueOf('A').charValue();

  private String createJson(String... witnesses) {
    JSONArray jsonWitnesses = new JSONArray();
    for (int i = 0; i < witnesses.length; i++) {
      String witness = witnesses[i];
      if (StringUtils.isNotEmpty(witness)) {
        JSONObject jsonWitness = new JSONObject();
        jsonWitness.put("id", Character.valueOf((char) (baseId + i)));
        jsonWitness.put("content", witness);
        jsonWitnesses.add(jsonWitness);
      }
    }
    JSONObject object = new JSONObject();
    object.put("witnesses", jsonWitnesses);
    String jsonContent = object.toString();
    return jsonContent;
  }

  /**
   * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse response)
   */
  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException {
    try {
      doGet(request, response);
    } catch (IOException e) {
      e.printStackTrace();// handle the error here
    }
  }
}

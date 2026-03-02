#!/usr/bin/env python
# -*- coding: utf-8 -*-

from setuptools import setup

readme = open('README.rst').read()
history = open('HISTORY.rst').read().replace('.. :changelog:', '')

setup(
    name='collatex',
    version='2.3',
    description='CollateX is a collation tool.',
    long_description=readme + '\n\n' + history,
    author='Ronald Haentjens Dekker',
    author_email='ronald.dekker@di.huc.knaw.nl',
    url='https://github.com/interedition/collatex',
    packages=[
        'collatex','ClusterShell'
    ],
    package_dir={'collatex':
                 'collatex'},
    include_package_data=True,
    python_requires='>=3.13',
    install_requires=[
        'networkx==3.6.1',
        'prettytable==3.17.0',
        'rapidfuzz==3.14.3',
    ],
    license="GPLv3",
    zip_safe=False,
    keywords='CollateX',
    classifiers=[
        'Development Status :: 5 - Production/Stable',
        'Intended Audience :: Science/Research',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License v3 (GPLv3)',
        'Natural Language :: English',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.13',
    ],
    test_suite='tests',
)

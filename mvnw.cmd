@echo off
set MAVEN_HOME=%~dp0tools\apache-maven-3.9.15
"%MAVEN_HOME%\bin\mvn.cmd" %*

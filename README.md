# Quickguide

Dies war meine Abgabe für das Modul `WebEngineering` an der DHBW Stuttgart im Sommersemester 2026.

Hierbei wurde das Bestehende System vom Dozenten vorgegeben und in Teilen integriert. Dieser hat ausdrücklich eingewilligt, dass Repos veröffentlicht werden dürfen, solange keine API Keys von ihm enthalten sind

## Struktur

Im Ordner `desktop_app` befinden sich alle benötigten Dateien zum Ausführen der Website. Hierbei kann im Verzeichnis `.../desktop_app/` mit `docker compose up --build` die Anwendung hochgefahren werden. Dafür muss Docker auf dem System installiert sein und die Ports `4011` und `4012` frei sein.
Nach dem starten ist die Seite unter `http://localhost:4011/` erreichbar

Technisch handelt es sich hierbei um eine React Website. Der hintergrund ist in html/css/js geschrieben und wird per iframe hinzugefügt.

## Beschreibung der Seite

Das Ziel dieser Anwendung war es, eine Linux Oberfläche nachzubilden. Anmeldedaten sind beliebiger Nutzername und als Passwort entweder `guest` für eingeschränkte Rechte und `admin123` für vollen zugriff.

Im Hintergrund wird das U-bahn Netz von Stuttgart in echtzeit abgebildet. Dies funktioniert mithilfe der VSS API ohne API Key. Da es sich dabei um Schätzungen handelt, welche mit Echtzeitdaten angepasst werden, kann es sehr gut sein, das die Positionen nicht akurat sind.
Die Stationen sind alle anwählbar und zeigen den richtigen Plan an der Station mit Verspätungen. 


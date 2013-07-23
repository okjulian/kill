Node.js kill
============
> Sistema de monitoreo que se encarga de apagar el proceso que mas memoria consuma si el uso de la memoria swap supera el 50%
>
> * Frecuencia de apagado de proceso: cada 1 minuto
>
> * No apaga motores de base de datos

Uso
---
    sudo nodejs kill

Requerimientos
--------------
Es necesario:

* Tener instalado un agente SNMP
* Correr el programa con permisos suficientes para ejecutar kill -9 pid

Funcionamiento
--------------
1.  Obtiene nombre de cada proceso
2.  Obtiene proceso que mas memoria ocupa, siempre que no sea mysqld
3.  Obtiene memoria swap utilizada
4.  Si la memoria swap supera el 50%
    1.  Mata al proceso que mas memoria ocupa

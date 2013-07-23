'use strict';

var snmp = require('snmp-native');

var host = 'localhost';
var community = 'public';

// Nombre de cada proceso
// Variable SNMP: hrSWRunName
// OID: 1.3.6.1.2.1.25.4.2.1.2
var oid2 = [1, 3, 6, 1, 2, 1, 25, 4, 2, 1, 2];
var nombres_procesos = {};
var mysqld_pid = null;

// Memoria usada por cada proceso
// Variable SNMP: hrSWRunPerfMem
// OID: 1.3.6.1.2.1.25.5.1.1.2
var oid = [1, 3, 6, 1, 2, 1, 25, 5, 1, 1, 2];

// Proceso candidato para morir
var victima = {
    pid: null,
    nombre: null,
    memoria_usada: 0,
    matar: function () {
        // Matamos a la victima
        return true;
    }
};

// Memoria Virtual o swap
// Variable SNMP: hrStorageVirtualMemory
// OID: 1.3.6.1.2.1.25.2.1.3
// Index: 3
// Descr: VirtualMemory
// AllocationUnits: 1.3.6.1.2.1.25.2.3.1.4.3
// Size: 1.3.6.1.2.1.25.2.3.1.5.3
// Used: 1.3.6.1.2.1.25.2.3.1.6.3
var oids = [ [1, 3, 6, 1, 2, 1, 25, 2, 3, 1, 5, 3], [1, 3, 6, 1, 2, 1, 25, 2, 3, 1, 6, 3] ];
var swap = {
    tamanio: null,
    usada: null,
    usada_porcentaje: function () {
        // TODO: Hay alguna forma de hacer que esto no sea una funcion?
        var resultado = (this.usada * 100) / this.tamanio;
        return Math.round(resultado);
    },
    supera: function (umbral) {
        return ( this.usada_porcentaje() > umbral );
    }
};

// Obtiene el nombre del proceso que mas memoria ocupa
var session2 = new snmp.Session({ host: host, community: community });
session2.getSubtree({ oid: oid2 }, function (err, varbinds) {

    if (err) {
        // Si hay un error, como SNMP timeout, terminamos aca.
        console.log(err);
    } else {
        // Esta es la lista de varbinds (varbind es un par oid-valor)
        varbinds.forEach(function (vb) {
            // El indice 11 de vb.oid es el numero de proceso
            nombres_procesos[vb.oid[11]] = vb.value;

            // Obtiene el numero de proceso de mysqld
            if (vb.value === 'mysqld') {
                mysqld_pid = vb.oid[11];
            }
        });
    }

    // Obtiene el proceso que mas memoria ocupa
    var session = new snmp.Session({ host: host, community: community });
    session.getSubtree({ oid: oid }, function (err, varbinds) {
        if (err) {
            // Si hay un error, como SNMP timeout, terminamos aca.
            console.log(err);
        } else {
            // Esta es la lista de varbinds (varbind es un par oid-valor)
            varbinds.forEach(function (vb) {
                // Si ocupa mas memoria que la victima anterior
                //  y no es mysqld, entonces es victima
                if (vb.value > victima.memoria_usada && vb.oid[11] !== mysqld_pid) {
                    // El indice 11 de vb.oid es el numero de proceso
                    victima.pid = vb.oid[11].toString();
                    victima.memoria_usada = vb.value;
                    victima.nombre = nombres_procesos[victima.pid];
                }
            });
        }

        // Obtener valores de memoria virtual
        var session3 = new snmp.Session({ host: host, community: community });
        session3.getAll({ oids: oids }, function (err, varbinds) {
            if (err) {
                // Si hay un error, como SNMP timeout, terminamos aca.
                console.log(err);
            } else {
                // Esta es la lista de varbinds (varbind es un par oid-valor)
                varbinds.forEach(function (vb) {
                    // Si es el oid de Size
                    if (vb.oid[10] === 5) {
                        swap.tamanio = vb.value;
                    } else if (vb.oid[10] === 6) {
                        // Es el oid de Used
                        swap.usada = vb.value;
                    }
                });
            }

            if (swap.supera(50) && victima.nombre !== undefined) {
                // victima.matar();
                console.log("Matando a proceso " + victima.nombre + "\n");
            } else {
                console.log("La victima que se salvo es " + victima.nombre +
                            ", su pid es " + victima.pid + ", y usa " +
                            victima.memoria_usada + " memoria.\n");
                console.log("Swap esta en " + swap.usada_porcentaje() +
                           "%\n");
            }

            session3.close();
        });

        session.close();
    });

    session2.close();
});

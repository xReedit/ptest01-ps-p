
var socketPrint, verificandoConexion=true, keyStorage = 'sys_list';
function openSocket(data) {
	// socketPrint = io.connect('http://localhost:5819', {
	socketPrint = io.connect('https://app.restobar.papaya.com.pe', {   
    	query: {
    		idorg: _data_o.o,
    		idsede: _data_o.s,
    		isServerPrint: 1,
    		isFromApp: 0
    	}
	});

	console.log('ws open');

	socketPrint.on('printerComanda', (data) => {   
		// const _dataCocinada = data[0].data ? data[0].data.filter(x => x.print).map(x => x.print) : data[1].print;
		// console.log('printerComanda data', data);
    if ( !data.nom_documento ) {console.log('no paso', data); return; }

		var _dataCocinada = [] ;
		_dataCocinada.push(data);
	  _printerComanda(_dataCocinada);	    


	    
	});

	socketPrint.on('printerOnly', (data) => {   
		// console.log('printerOnly data', data);
    if ( !data.nom_documento ) {console.log('no paso', data);  return; }
		var _dataCocinada = [] ;
		_dataCocinada.push(data);
	    _printerComanda(_dataCocinada);	    
	});

  socketPrint.on('verificar-conexion', (statusConnect) => {   
    // console.log('printerOnly data', data);
    console.log('status:', statusConnect)
  });


	window.addEventListener('focus', (event) => {
      verifyConexionSocket();
    });

    window.addEventListener('online', () => {
      showStatusConexNavigator(true, 'navigator_online');
    });
    window.addEventListener('offline', () => {
      showStatusConexNavigator(false, 'navigator_offline');
    });

}

function showStatusConexNavigator(online, evento) {

    statusConexSocket(online, evento);
    // this.isSocketOpen = online;
    // this.isSocketOpenSource.next(online);

    if (online) {
      console.log('navegador conectado');
    } else {
      console.log('!!! navegador desconectado !!');
      verificandoConexion = false;
    }
  }


function statusConexSocket(isConncet, evento) {

    let msj = 'Conectando datos ...';
    switch (evento) {
      case 'conected': // conectando
        msj = 'Conectando datos ...';
        break;
      case 'connect_failed': // conectando
        msj = 'Conectando datos ..';
        this.verificandoConexion = false;
        break;
      case 'connect_error': // conectando
        msj = 'Conectando datos .';
        this.verificandoConexion = false;
        break;
      case 'disconnect': // conectando
        msj = 'Restableciendo conexion ...';
        this.verificandoConexion = false;
        break;
      case 'navigator_offline': // conectando
        msj = 'Conexion cerrada -b ...';
        this.verificandoConexion = false;
        break;
      case 'navigator_online': // conectando
        msj = 'Conectando datos -b ...';
        break;
    }    
}

function emitPrinterFlag(dataPedido) {    
    socketPrint.emit('printer-flag-impreso', dataPedido);
  }

function emitPrinterFlagUpdate(id) {    
    socketPrint.emit('printer-flag-impreso-update', id);
  }

function verifyConexionSocket() {
    // console.log('verificando...');
    if ( verificandoConexion ) {return; }
    verificandoConexion = true;
    socketPrint.emit('verificar-conexion', socketPrint.id);
  }

function closeSocket() {    
    socketPrint.disconnect(true);
}




//// STORAGE PRINTER


function setItemStorage(_id) {
  var _list = getListStorage();

  _list.push({id: _id});

  setListStorage(_list);

}

function setListStorage(_list) {
  localStorage.setItem(keyStorage, JSON.stringify(_list));

  clearStorage();
}

function searhStorage(_id) {
  var _list = getListStorage();  
  return !!_list.filter(i => parseInt(i.id) === parseInt(_id))[0];
}

function clearStorage() {
  var _list = getListStorage();  

  if ( _list.length > 100 ) {
    const idMax = _list[80].id;
    _list = _list.filter(i => i.id > idMax);
    setListStorage(_list);
  }
}


function getListStorage() {
  var _list = localStorage.getItem(keyStorage);
  return _list ? JSON.parse(_list) : [];  
}


//// STORAGE PRINTER -->>>
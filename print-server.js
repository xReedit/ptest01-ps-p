let ListDocs = [], ListEstadistica = [], listOnlyPrinters = [], ipUrlLocal='', IntervalClearCola = null, IntervalLoadCola, ultimoId = 0, ultimoIdData, valRows=0, xsourceEventCola, xPausaError = false, _data_o = {}, isServerPrintSocket=0, nIntervIdWS = null;

$(document).ready(function() {
	ultimoId=0;
	getDataO();
	// 
	setTimeout(() => {
		$("body").addClass("loaded");
		// xInitPrintServer();
		xPrepararData();
	}, 2000);	

		
});


function getDataO() {
	_data_o = getUrlParameter('o', '?');
	_data_o = JSON.parse(atob(_data_o));

	_data_o.isFromApp = 0;
	_data_o.isServerPrint=1;

	// console.log('_data_o', _data_o);
	return _data_o;
	// openSocket(_data_o);
}


function xPrepararData() {
	const _dataSendO = getDataO();
	$.ajax({
		url: './bdphp/log_003.php?op=0',
		type: 'POST',
		data: _dataSendO
	})
	.done((res) => {
		ipUrlLocal = res;
		xUpdateEstructuras();
		xIsPrinterSocket();
		/*xVerificarColaImpresion();*/
	});
}

// sockets 240920

//varifica si el server print recibe socket
function xIsPrinterSocket() {
	const _dataSendO = getDataO();
	$.ajax({
		url: './bdphp/log_003.php?op=101',
		type: 'POST',
		data: _dataSendO
	})
	.done((res) => {
		isServerPrintSocket = parseInt(res);		
		if ( isServerPrintSocket !== 0 ) { // so trabaja con sockets 
			// verifica si hay impresiones pendientes
			openSocket();
			console.log('ws', JSON.stringify(_data_o));
			// xInitPrintServer();
			xVerificarColaImpresionMix();

			// verificarConnectWS();
			return;
		}

		// sino trabaja con sockets
		xVerificarColaImpresion();
		setInterval(xRunTimerUpdateEstado, 3000);
	});	
}


function _printerComanda(data) {
	console.log('from socket');
	// const _id = data.idprint_server_detalle;
	ultimoId = data[0].idprint_server_detalle; // para busqueda impresion mix
	setItemStorage(ultimoId);
	tdRowsPrint(data);
}

function tdRowsPrint(_ListDocumentos) {
	let row = ListDocs.length;
		let cadena_tr = '';

		_ListDocumentos.map((x, index)=>{
			ListDocs.push(x);		
			ListEstadistica.push(x);

			const id = x.idprint_server_detalle;
			let _detalle_json;
			let _ip_print;
			try {
				_detalle_json = typeof x.detalle_json === 'object' ? x.detalle_json : JSON.parse(x.detalle_json);
				_ip_print = _detalle_json.Array_print[0].ip_print
				
			} catch (error) {
				try {
					_detalle_json = JSON.parse(x.detalle_json.replace('"{', '{').replace('}"', '}'));
					_ip_print = _detalle_json.Array_print[0].ip_print
				}	
				catch (error) {  
					_detalle_json = null; 
					_ip_print = 'error' 
					console.log('log error', x.detalle_json);
				}
			}

			row++;

			// x.hora = x.hora ? x.hora : new Date().toLocaleTimeString();
			// x.hora = new Date().toLocaleTimeString();
			x.hora = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

			cadena_tr += '<tr id="tr' + id +'">'+
				'<td>'+ row +'</td>'+
				'<td>' + x.hora + '</td>' +
				'<td>' + x.descripcion_doc + '</td>' +
				'<td>' + _ip_print + '</td>' +
				'<td id="td_estado' + id +'">Pendiente</td>' +
			'</tr>';
		});


		$("#listDoc").append(cadena_tr).trigger('create');

		xGenerarGrafico();

		// ultimoId = ultimoIdData;
		xSendPrint();
}
// sockets 240920



function xVerificarColaImpresion(){	
	// console.log(JSON.stringify(_data_o));
	if ( isServerPrintSocket !== 0 ) { return;}
	const _urlEvent = './bdphp/log_003.php?op=201&u=' + ultimoId + '&data=' + JSON.stringify(_data_o);
	if(typeof(EventSource) !== "undefined") {
		xsourceEventCola = new EventSource(_urlEvent);
		xsourceEventCola.onmessage = function(event) {
			valRows = event.data === "" ? valRows : event.data;
			if (parseInt(valRows) > parseInt(ultimoId)) {
				console.log('not socket');
				ultimoIdData = event.data;
				xInitPrintServer();
			}
	        // if(event.data!==xValCountPedidos){xValCountPedidos=event.data;xActualizarItems();}
	    };
	}
}


// mix socket - 240221
function xVerificarColaImpresionMix(){	
	// console.log(JSON.stringify(_data_o));
	// if ( isServerPrintSocket !== 0 ) { return;}
	const _urlEvent = './bdphp/log_003.php?op=2011&u=' + ultimoId + '&data=' + JSON.stringify(_data_o);
	if(typeof(EventSource) !== "undefined") {
		xsourceEventCola = new EventSource(_urlEvent);
		xsourceEventCola.onmessage = function(event) {
			// valRows = event.data === "" ? valRows : event.data;
			// if (parseInt(valRows) > parseInt(ultimoId)) {
				console.log('socket mix', event.data);
				const _res = JSON.parse(event.data);
				if ( _res.length > 0 ) {
					let _ListDocumentos = _res;
					processPrintToList(_ListDocumentos);
				}
				// ultimoIdData = event.data;
				// xInitPrintServer();
			// }
	        // if(event.data!==xValCountPedidos){xValCountPedidos=event.data;xActualizarItems();}
	    };
	}
}


function xInitPrintServer() {
	// console.log('not socket');
	// const _ultimoId = ListDocs.length === 0 ? '' : ultimoId;
	var dataSend = getDataO();
	dataSend.ultimoId = ultimoId;
	$.ajax({
		url: './bdphp/log_003.php?op=2',
		type: 'POST',	
		data: dataSend
	})
	.done((res) => {
		const _res = $.parseJSON(res);
		let _ListDocumentos = _res.datos;

		/// agregar a la lista
		let row = ListDocs.length;
		let cadena_tr = '';

		_ListDocumentos.map((x, index)=>{

			const id = x.idprint_server_detalle;

			// verificar si ya imprimio
			if (searhStorage(id)) { 
				// update estado
				onlyUpdateEstadoOk(id);
				return; 
			}

			setItemStorage(id);

			ListDocs.push(x);		
			ListEstadistica.push(x);

						
			let _detalle_json;
			let _ip_print;
			try {
				_detalle_json = JSON.parse(x.detalle_json);
				_ip_print = _detalle_json.Array_print[0].ip_print
				
			} catch (error) {
				try {
					_detalle_json = JSON.parse(x.detalle_json.replace('"{', '{').replace('}"', '}'));
					_ip_print = _detalle_json.Array_print[0].ip_print
				}	
				catch (error) {  
					_detalle_json = null; 
					_ip_print = 'error' 
					console.log('log ', x.detalle_json);
				}
			}

			row++;
			cadena_tr += '<tr id="tr' + id +'">'+
				'<td>'+ row +'</td>'+
				'<td>' + x.hora + '</td>' +
				'<td>' + x.descripcion_doc + '</td>' +
				'<td>' + _ip_print + '</td>' +
				'<td id="td_estado' + id +'">Pendiente</td>' +
			'</tr>';
		});

		xGenerarGrafico();


		// let cadena_tr = '';				
		// _ListDocumentos.map((x, index) => {			
		// 	const id = x.idprint_server_detalle;			
		// 	row++;
		// 	cadena_tr += '<tr id="tr' + id +'">'+
		// 		'<td>'+ row +'</td>'+
		// 		'<td>' + x.hora + '</td>' +
		// 		'<td>' + x.descripcion_doc + '</td>' +
		// 		'<td id="td_estado' + id +'">Pendiente</td>' +
		// 	'</tr>';
		// });

		$("#listDoc").append(cadena_tr).trigger('create');

		ultimoId = ultimoIdData;
		xSendPrint();
	});	  
}

function processPrintToList(_ListDocumentos) {
	/// agregar a la lista
		let row = ListDocs.length;
		let cadena_tr = '';

		_ListDocumentos.map((x, index)=>{

			const id = x.idprint_server_detalle;

			// verificar si ya imprimio
			if (searhStorage(id)) { 
				// update estado
				onlyUpdateEstadoOk(id);
				return; 
			}

			setItemStorage(id);

			ListDocs.push(x);		
			ListEstadistica.push(x);

						
			let _detalle_json;
			let _ip_print;
			try {
				_detalle_json = JSON.parse(x.detalle_json);
				_ip_print = _detalle_json.Array_print[0].ip_print
				
			} catch (error) {
				try {
					_detalle_json = JSON.parse(x.detalle_json.replace('"{', '{').replace('}"', '}'));
					_ip_print = _detalle_json.Array_print[0].ip_print
				}	
				catch (error) {  
					_detalle_json = null; 
					_ip_print = 'error' 
					console.log('log ', x.detalle_json);
				}
			}

			row++;
			cadena_tr += '<tr id="tr' + id +'">'+
				'<td>'+ row +'</td>'+
				'<td>' + x.hora + '</td>' +
				'<td>' + x.descripcion_doc + '</td>' +
				'<td>' + _ip_print + '</td>' +
				'<td id="td_estado' + id +'">Pendiente</td>' +
			'</tr>';
		});

		xGenerarGrafico();


		// let cadena_tr = '';				
		// _ListDocumentos.map((x, index) => {			
		// 	const id = x.idprint_server_detalle;			
		// 	row++;
		// 	cadena_tr += '<tr id="tr' + id +'">'+
		// 		'<td>'+ row +'</td>'+
		// 		'<td>' + x.hora + '</td>' +
		// 		'<td>' + x.descripcion_doc + '</td>' +
		// 		'<td id="td_estado' + id +'">Pendiente</td>' +
		// 	'</tr>';
		// });

		$("#listDoc").append(cadena_tr).trigger('create');

		ultimoId = ultimoIdData;
		xSendPrint();
}

async function xSendPrint() {
	// const _listSend = ListDocs.map((x)=> {
	// ListDocs.filter(x => !x.xPausaError).map(async (x, index) => {
	for (let index = 0; index < ListDocs.length; index++) {
		let x = ListDocs[index];
		let _detalle_json;
		let rpt_p = '';
		
		const _id = x.idprint_server_detalle;
		if (x.impreso===1) continue;
		// if ( xPausaError ) return;
		if (x.error === 1) continue;

		try {
			_detalle_json = JSON.parse(x.detalle_json.replace('"{', '{').replace('}"', '}'));
		} catch (error) {
			try {				
				_detalle_json = JSON.parse(x.detalle_json);
			} catch (error) {
				x.error = 1;
				xUpdateEstadoError(_id);
				xErrorPrint(_id);
				return;
			}
		}
		
		let _nomUs = x.idprint_server_estructura === '3' ? '' : _detalle_json.Array_enca.nom_us === undefined ? _detalle_json.Array_enca[0].nom_us : _detalle_json.Array_enca.nom_us; // -> 
		_nomUs = _nomUs.split(' ')[0];
		
		const _listSend = { data: _detalle_json, nom_documento: x.nom_documento, nomUs:_nomUs, hora: x.hora };
		x.impreso=1;
		x.error = 0;
		x.quitar_lista = 0;		
		// return { data: _detalle_json, nom_documento: x.nom_documento, nomUs: _nomUs };
		
		try {			
			rpt_p = await xSendPrintNow(_listSend, _id, x);
		} catch (err) {
			console.log(err.statusText);
		}


		// $.ajax({
		// 	url: ipUrlLocal+'/restobar/print/client/pruebas.print_url.php',
		// 	type: 'POST',
		// 	data: { arrData: _listSend }
		// })
		// .done((res) => {
		// 	// console.log(res);
		// 	xUpdateEstado(_id);
		// 	// return true;
		// })
		// .fail(function (e) {
		// 	xPausaError = true;
		// 	x.error = 1;
		// 	xUpdateEstadoError(_id);
		// 	xErrorPrint(_id);
		// 	// return false;
		// });

		console.log('rpt_p', rpt_p);

		
	};
	
}

async function xSendPrintNow(_listSend, _id, item) {
	var rpt_now;	
	const nomFile = _listSend.nom_documento+ '.php';
	await $.ajax({
			url: ipUrlLocal + '/restobar/print/client/' + nomFile,
			type: 'POST',
			timeout: 9000,
			data: { arrData: JSON.stringify(_listSend) },
			success: (res) => {
				if(res.indexOf('Error, Verifique') > -1) {
					xPausaError = true;
					// ListDocs[index].error = 1;
					item.error= 1;					
					xUpdateEstadoError(_id);					
					xErrorPrint(_id);
					rpt_now = false;	
					console.log('error ', res);			
				} else {					
					xUpdateEstado(_id, _listSend.data.Array_enca.idpedido, _listSend);

					try {
						item.quitar_lista = 1;
						// ListDocs[index].quitar_lista = 1;
					} catch(err){console.log('isnul quitar_lista', item)};
					rpt_now = true;		
				}
			},
			error: (e, textStatus, msj) => {				
				xPausaError = true;
				item.error = 1;
				// ListDocs[index].error = 1;				
				xUpdateEstadoError(_id);
				xErrorPrint(_id);
				rpt_now = false;
				// return rpt_now;
				// e.abort();
			}
		});
		// .done((res) => {
		// 	// console.log(res);
		// 	if(res.indexOf('Error, Verifique') > -1) {
		// 		xPausaError = true;
		// 		ListDocs[index].error = 1;
		// 		xUpdateEstadoError(_id);
		// 		xErrorPrint(_id);
		// 		rpt_now = false;				
		// 	} else {
		// 		xUpdateEstado(_id);
		// 		rpt_now = true;
		// 	}

		// })
		// .fail((e, textStatus, msj) => {
		// 	console.log(textStatus);
		// 	xPausaError = true;
		// 	ListDocs[index].error = 1;
		// 	xUpdateEstadoError(_id);
		// 	xErrorPrint(_id);
		// 	rpt_now = false;			
		// }).always((e, textStatus, msj) => {
		//     rpt_now = false;		    
		// });
		// timeout(5000);

		// console.log(_promise);
		// _promise.then(
		// 	(res) => {
		// 		clearTimeout(timeoutId);
		// 		resolve(res);
		// 	},
		// 	(err) => {
		// 		rpt_now = false;
		// 	}
		// );

		return rpt_now;
		// console.log('rpt_p', rpt_p);
}


function xErrorPrint(_id) {	
	$("#div_error").removeClass('xInvisible');
	const nomTd = "#td_estado" + _id;
	$(nomTd).text('Error');
	$(nomTd).addClass('xRojo');
}

function xIntentarImprimirNuevamente() {
	location.reload();
}

function xEliminarPedidosError() {
	let arrListBorrar='';
	ListDocs.map((x) => {
		if (x.error === 0) return;

		const _id = x.idprint_server_detalle;
		x.error = 0;
		x.quitar_lista = 1;
		x.eliminado = true;	
		arrListBorrar += _id+',';
					
		const nomTd = "#td_estado" + _id;
		$(nomTd).text('Eliminado');
		$(nomTd).addClass('xRojo');
		if (IntervalClearCola === null) {
			IntervalClearCola = setInterval(xClearCola, 7000);
		}		
	});

	arrListBorrar = arrListBorrar.slice(0, -1);
	$.ajax({
		url: './bdphp/log_003.php?op=301',
		type: 'POST',
		data: { id: arrListBorrar }
	});

	$("#div_error").addClass('xInvisible');
}

function xUpdateEstado(_id, _idpedido = 0, _itemPrinter = null) {	

	// if ( isServerPrintSocket == 1 ) { 
	// emitPrinterFlag(_id);
	// 	xMarcarOkPedido(_id);
	// 	return;
	// }

	


	// agregamos a la lista para actualizar su estado impreso					
	const _dataPush = {item: _itemPrinter, idprint_server_detalle: _id, idpedido: _idpedido}

	//chequeamos si es pedido y si ya existe en la lista para no actualizar cada vez
	// if ( _idpedido !== 0 ) {
	// 	const isPedidoList = listOnlyPrinters.filter(x => x.idpedido == _idpedido)[0];
	// 	if ( !isPedidoList ) {
	// 		listOnlyPrinters.push(_dataPush);
	// 	}

	// } else {
	// 	listOnlyPrinters.push(_dataPush);
	// }

	listOnlyPrinters.push(_dataPush);

	if ( isServerPrintSocket == 1 ) { 				
		emitPrinterFlagUpdate(_id);
		emitPrinterFlag(JSON.stringify(listOnlyPrinters));
	}	
	


	xMarcarOkPedido(_id);


	// const _id = ListDocs[_index].idprint_server_detalle;	
	// $.ajax({
	// 	url: './bdphp/log_003.php?op=3',
	// 	type: 'POST',
	// 	data: { id: _id, idpedido: _idpedido}
	// })
	// .done( ()=> {
	// 	xMarcarOkPedido(_id);
	// });
}

function xRunTimerUpdateEstado() {
	// const _id = ListDocs[_index].idprint_server_detalle;	
	console.log('paso a chequear',listOnlyPrinters.length);

	if (listOnlyPrinters.length === 0 ) {return; }

	const idsPrinterDetalle = listOnlyPrinters.map(x => x.idprint_server_detalle).join(',');
	const idsPedidos = listOnlyPrinters.filter(x => x.idpedido !== 0).map(x => x.idpedido).join(',');
	listOnlyPrinters = [];

	// console.log('paso a guardar',listOnlyPrinters);
	if ( isServerPrintSocket == 1 ) { 	
		emitPrinterFlag(JSON.stringify(listOnlyPrinters));
	}
	


	$.ajax({
		url: './bdphp/log_003.php?op=3',
		type: 'POST',
		data: { id: idsPrinterDetalle, idpedido: idsPedidos}
	})
	.done( (res)=> {
		console.log('update ok');

		// xMarcarOkPedido(_id);
		//  borrar lista
		// listOnlyPrinters = [];
	});
}

function onlyUpdateEstadoOk(_id) {
	$.ajax({
		url: './bdphp/log_003.php?op=3',
		type: 'POST',
		data: { id: _id, idpedido: ''}
	})
	.done( (res)=> {
		// xMarcarOkPedido(_id);
		console.log('update estado', _id);

	});
}

function xMarcarOkPedido(_id){
	const nomTd = "#td_estado" + _id;
	$(nomTd).text('Impreso');
	$(nomTd).addClass('xVerde');

	if (IntervalClearCola===null) {
		IntervalClearCola = setInterval(xClearCola, 7000);
	}
}

function xUpdateEstadoError(_id) {
	// const _id = ListDocs[_index].idprint_server_detalle;	
	$.ajax({
		url: './bdphp/log_003.php?op=302',
		type: 'POST',
		data: { id: _id}
	}).done((x)=> {
		// console.log('confirmacion flag',  x);
	});
}

function xClearCola() {
	if (ListDocs.length===0) {
		clearInterval(IntervalClearCola);
		IntervalClearCola=null;
		return;}	
	
	let paso=false;
	ListDocs.map((x, index) => {
		if (x.quitar_lista === 0) return;
		if (x.error === 1) return;
		if ((x.impreso === 1 || x.eliminado ) && !paso) {
			const nomTr = "#tr" + x.idprint_server_detalle;
			$(nomTr).fadeOut("slow", ()=>{
				$(this).remove();
				ListDocs.splice(index,1);
			});			
			paso=true;
		}
	})
}


function xUpdateEstructuras() {
	const _dataSendO = getDataO();
	$.ajax({
		url: './bdphp/log_003.php?op=5',
		type: 'POST',
		"crossDomain": true,
		"headers": {
              "accept": "application/json",
              "Access-Control-Allow-Origin":"*"
          },
		data : _dataSendO
	})
	.done((res) => {
		const logo = res;
		$.ajax({
			url: './bdphp/log_003.php?op=4',
			type: 'POST'
		})
		.done((res) => {
			const _res = $.parseJSON(res);		
			let listEstructuras = _res.datos;
	
			$.ajax({
				url: ipUrlLocal + '/restobar/print/client/comprobar_estructura.php',
				type: 'POST',
				data: { arrEstructura: listEstructuras, logo: logo}
			})
			.done((res) => {
				console.log(res);
			});	
	
		});
	});
}

function xGenerarGrafico() {
	const _ListEstadisticaView = groupBy(ListEstadistica, 'descripcion_doc');
	let _chart = [];
	Object.keys(_ListEstadisticaView).map((k, index) => {
		_chart.push([k, _ListEstadisticaView[k].length]);
	});

	// console.log(_chart);

	var chart = c3.generate({
		bindto: '#xchart',
		data: {			
			columns: _chart,
			type: 'bar', labels: true
		},
		bar: {
			width: {
				ratio: 0.3 // this makes bar width 50% of length between ticks
			}			
		}
	});

}

function getUrlParameter(sParam,simbolo) {
	var sPageURL = window.location.href;
	sPageURL=sPageURL.replace('-',' ');
	var sURLVariables = sPageURL.split(simbolo);
	for (var i = 0; i < sURLVariables.length; i++)
		{ var sParameterName = sURLVariables[i].split('=');
			if (sParameterName[0] == sParam) { return sParameterName[1]; } }
}


var groupBy = function (xs, key) {
	return xs.reduce(function (rv, x) {
		(rv[x[key]] = rv[x[key]] || []).push(x);
		return rv;
	}, {});
};
let ListDocs = [], ListEstadistica = [], ipUrlLocal='', IntervalClearCola = null, IntervalLoadCola, ultimoId = 0, ultimoIdData, valRows=0, xsourceEventCola, xPausaError = false;

$(document).ready(function() {
	ultimoId=0;
	xUpdateEstructuras();
	setTimeout(() => {
		$("body").addClass("loaded");
		// xInitPrintServer();
	}, 1000);	
	
	xPrepararData();
});

function xPrepararData() {
	const _data_o = getUrlParameter('o', '?');
	console.log(_data_o);
	$.ajax({
		url: './bdphp/log_003.php?op=0',
		type: 'POST',
		data: JSON.parse(atob(_data_o))
	})
	.done((res) => {
		ipUrlLocal = res;
		xVerificarColaImpresion();
	})
}

function xVerificarColaImpresion(){
	if(typeof(EventSource) !== "undefined") {
		xsourceEventCola = new EventSource('./bdphp/log_003.php?op=201&u=' + ultimoId);
		xsourceEventCola.onmessage = function(event) {
			valRows = event.data === "" ? valRows : event.data;
			if (parseInt(valRows) > parseInt(ultimoId)) {
				ultimoIdData = event.data;
				xInitPrintServer();
			}
	        // if(event.data!==xValCountPedidos){xValCountPedidos=event.data;xActualizarItems();}
	    };
	}
}



function xInitPrintServer() {
	// const _ultimoId = ListDocs.length === 0 ? '' : ultimoId;
	$.ajax({
		url: './bdphp/log_003.php?op=2',
		type: 'POST',	
		data: { ultimoId: ultimoId }
	})
	.done((res) => {
		const _res = $.parseJSON(res);
		let _ListDocumentos = _res.datos;

		/// agregar a la lista
		let row = ListDocs.length;

		_ListDocumentos.map((x)=>{
			ListDocs.push(x);		
			ListEstadistica.push(x);
		});

		xGenerarGrafico();


		let cadena_tr = '';				
		_ListDocumentos.map((x, index) => {			
			const id = x.idprint_server_detalle;			
			row++;
			cadena_tr += '<tr id="tr' + id +'">'+
				'<td>'+ row +'</td>'+
				'<td>' + x.hora + '</td>' +
				'<td>' + x.descripcion_doc + '</td>' +
				'<td id="td_estado' + id +'">Pendiente</td>' +
			'</tr>';
		});

		$("#listDoc").append(cadena_tr).trigger('create');

		ultimoId = ultimoIdData;
		xSendPrint();
	});	  
}

function xSendPrint() {
	// const _listSend = ListDocs.map((x)=> {
	ListDocs.map((x)=> {
	// for (let index = 0; index < ListDocs.length; index++) {
		// let x = ListDocs[index];	

		if (x.impreso===1) return;
		if ( xPausaError ) return;

		const _id = x.idprint_server_detalle;
		const _detalle_json = JSON.parse(x.detalle_json.replace('"{', '{').replace('}"', '}')); //JSON.parse(x.detalle_json);
		let _nomUs = x.idprint_server_estructura === '3' ? '' : _detalle_json.Array_enca.nom_us === undefined ? _detalle_json.Array_enca[0].nom_us : _detalle_json.Array_enca.nom_us; // -> 
		_nomUs = _nomUs.split(' ')[0];
		
		const _listSend = { data: _detalle_json, nom_documento: x.nom_documento, nomUs:_nomUs, hora: x.hora };
		x.impreso=1;
		x.error = 0;
		// return { data: _detalle_json, nom_documento: x.nom_documento, nomUs: _nomUs };



		$.ajax({
			url: ipUrlLocal+'/restobar/print/client/pruebas.print_url.php',
			type: 'POST',
			data: { arrData: _listSend }
		})
		.done((res) => {
			console.log(res);
			xUpdateEstado(_id);
		})
		.fail(function (e) {
			xPausaError = true;
			x.error = 1;
			xErrorPrint(_id);
		});
		
	});
	
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

function xUpdateEstado(_id) {
	// const _id = ListDocs[_index].idprint_server_detalle;	
	$.ajax({
		url: './bdphp/log_003.php?op=3',
		type: 'POST',
		data: { id: _id}
	})
	.done( ()=> {
		const nomTd = "#td_estado" + _id;
		$(nomTd).text('Impreso');
		$(nomTd).addClass('xVerde');

		if (IntervalClearCola===null) {
			IntervalClearCola = setInterval(xClearCola, 7000);
		}
	});
}

function xClearCola() {
	if (ListDocs.length===0) {
		clearInterval(IntervalClearCola);
		IntervalClearCola=null;
		return;}	
	
	let paso=false;
	ListDocs.map((x, index) => {
		if (x.error === 1) return;
		if (x.impreso === 1 && !paso) {
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
	$.ajax({
		url: './bdphp/log_003.php?op=5',
		type: 'POST',
	})
	.done((res) => {
		const logo = res;
		$.ajax({
			url: './bdphp/log_003.php?op=4',
			type: 'POST',		
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
	const _ListEstadisticaView = groupBy(ListEstadistica, 'nom_documento');
	let _chart = []
	Object.keys(_ListEstadisticaView).map(k => {
		_chart=[k, _ListEstadisticaView[k].length];
	});

	console.log(_chart);

	var chart = c3.generate({
		bindto: '#xchart',
		data: {
			columns: [
				_chart,				
			],
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
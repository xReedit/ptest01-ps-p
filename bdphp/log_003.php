<?php
	//log registrar el print server
	session_start();	
	header('Access-Control-Allow-Origin: *'); 
	 // header("Set-Cookie: samesite-test=1; expires=0; path=/; samesite=None");
	header('content-type: text/html; charset: utf-8');
	header('Content-Type: text/event-stream');
	header('Cache-Control: no-cache');
	include "ManejoBD.php";
	
	if (isset($_SESSION['nombd'])) {
		$bd=new xManejoBD($_SESSION['nombd']);
	}

	date_default_timezone_set('America/Lima');

	$op = isset($_GET['op']) ? $_GET['op'] : 0;	
	$ido = isset($_POST['o']) ? $_POST['o'] : 0;	
	$idsede = isset($_POST['s']) ? $_POST['s'] : 0;	


	// $bdNom = 'restobar';
	// if ($_POST['d']==='d') {$bdNom = 'restobar_demo';}
	// $bd=new xManejoBD($bdNom);
	// $_SESSION['nombd']=$bdNom;

    switch ($op) {
		case '0':// prepar variables					
				// $_SESSION['ido']=$_POST['o'];
				// $_SESSION['idsede']=$_POST['s'];

				$bdNom = 'restobar';
				if ($_POST['d']==='d') {$bdNom = 'restobar_demo';}
				$_SESSION['nombd']=$bdNom;
				$bd=new xManejoBD($_SESSION['nombd']);

				// ip local
				$sql="select ip_server_local, isprinter_socket from sede where idsede=$idsede";
				$ipLocal=$bd->xDevolverUnDato($sql);
				print "http://".$ipLocal;
				return;
			break;
		case '101':// prepar variables					
				// $_SESSION['ido']=$_POST['o'];
				// $_SESSION['idsede']=$_POST['s'];

				
				$sql="select isprinter_socket from sede where idsede=$idsede";
				$isPrinterSocket=$bd->xDevolverUnDato($sql);
				print $isPrinterSocket;
				// echo $sql;
				return;
			break;
		case '1': //registrar impresion
			$detalle_json = $_POST['datos'];
			$idprint_server_estructura = $_POST['idprint_server_estructura'];
			$tipo = $_POST['tipo'];
			$sql="INSERT INTO print_server_detalle (idorg, idsede, idprint_server_estructura, descripcion_doc, fecha, hora, detalle_json) 
											values (".$_SESSION['ido'].",".$_SESSION['idsede'].",".$idprint_server_estructura.", '".$tipo."', DATE_FORMAT(now(),'%d/%m/%Y'), DATE_FORMAT(now(),'%H:%i:%s'),'".$detalle_json."')";
			
			// echo $sql;
			$bd->xConsulta($sql);
			break;
		case '2': // buscar documentos no imprimidos
			$UltimoId=$_POST['ultimoId'];
			if ( $UltimoId!='' ) { $UltimoId=' and psd.idprint_server_detalle>'.$UltimoId.' '; }
			// $sql="SELECT psd.*, pse.estructura_json, pse.nom_documento, u.nombres as nomUs
			// 			FROM print_server_detalle as psd
			// 				INNER JOIN print_server_estructura as pse on pse.idprint_server_estructura = psd.idprint_server_estructura
			// 				INNER JOIN usuario as u on u.idusuario = psd.idusuario
			// 		WHERE (psd.idorg=".$_SESSION['ido']." and psd.idsede=".$_SESSION['idsede']." and psd.impreso=0) and psd.estado=0 ".$UltimoId." ORDER BY psd.idprint_server_detalle DESC";

			// 091220 solo los ultimos 5minutos
			// and  TIMESTAMPDIFF(MINUTE, STR_TO_DATE(concat(psd.fecha, ' ', psd.hora), '%d/%m/%Y %H:%i:%s'),DATE_FORMAT(now(), '%Y-%m-%d %H:%i:%s')) < 5

			// para atender las reservas que se hagan antes de horario de atencion
			// estas se imprimiran cuando inicia el servidor de impresion
			// or (psd.isreserva = 1 and psd.impreso = 0)
			
			$sql="SELECT psd.*, pse.estructura_json, pse.nom_documento
						FROM print_server_detalle as psd
							INNER JOIN print_server_estructura as pse on pse.idprint_server_estructura = psd.idprint_server_estructura							
					WHERE (psd.idorg=$ido and psd.idsede=$idsede and psd.impreso=0) 
						and  TIMESTAMPDIFF(MINUTE, STR_TO_DATE(concat(psd.fecha, ' ', psd.hora), '%d/%m/%Y %H:%i:%s'),DATE_FORMAT(now(), '%Y-%m-%d %H:%i:%s')) < 20
						and psd.estado=0 ".$UltimoId."
						or (psd.isreserva = 1 and psd.impreso = 0)
					ORDER BY psd.idprint_server_detalle DESC";
			
			$bd->xConsulta($sql);
			break;
		case '201': //verificar si hay nuevos registros
			$UltimoId=$_GET['u'];
			$data=json_decode($_GET['data'], true);
			$idorg = $data['o'];
			$idsede = $data['s'];
			if ( $UltimoId!='' ) { $UltimoId=' and idprint_server_detalle >'.$UltimoId.' '; }

			$sql="SELECT MAX(idprint_server_detalle) FROM print_server_detalle where (idsede=$idsede and impreso=0)".$UltimoId." limit 2";
						
			$numero_pedidos_actual=$bd->xDevolverUnDato($sql);
			// echo $sql;
			echo "retry: 2000\n"."data:".$numero_pedidos_actual."\n\n";
			ob_flush();
			flush();
			break;

			//verificar si hay nuevos registros cada 20segundos
			// 080421 se requiere verificar los que NO fueron impresos por socket
		case '2011': 
			$UltimoId=$_GET['u'];
			$data=json_decode($_GET['data'], true);
			$idorg = $data['o'];
			$idsede = $data['s'];

			// if ( $UltimoId!='' ) { $UltimoId=' and idprint_server_detalle >'.$UltimoId.' '; }

			// $sql="SELECT MAX(idprint_server_detalle) FROM print_server_detalle where (idsede=$idsede and impreso=0)".$UltimoId." limit 2";
						
			// $numero_pedidos_actual=$bd->xDevolverUnDato($sql);

			$sql="SELECT psd.*, pse.estructura_json, pse.nom_documento
						FROM print_server_detalle as psd
							INNER JOIN print_server_estructura as pse on pse.idprint_server_estructura = psd.idprint_server_estructura							
					WHERE (psd.idsede=$idsede and psd.impreso=0) 
						and  TIMESTAMPDIFF(MINUTE, STR_TO_DATE(concat(psd.fecha, ' ', psd.hora), '%d/%m/%Y %H:%i:%s'),DATE_FORMAT(now(), '%Y-%m-%d %H:%i:%s')) < 30
						and psd.estado=0 and psd.idprint_server_detalle>0
						or (psd.isreserva = 1 and psd.impreso = 0)
					ORDER BY psd.idprint_server_detalle DESC";
			
			$dataRpt = $bd->xConsulta3($sql);

			// echo $sql;
			echo "retry: 20000\n"."data:".$dataRpt."\n\n";
			ob_flush();
			flush();
			break;
		case '3': //guardar impreso=1
			$sqlA="update print_server_detalle set impreso=1 where idprint_server_detalle in(".$_POST['id'].") and impreso = 0; ";
			// $bd->xConsulta_NoReturn($sql);

			// guardar estado pedido como visto
			if ( $_POST['idpedido'] !== '' ) {
				$sqlB="update pedido set pwa_estado='A', is_printer = 1 where idpedido in(".$_POST['idpedido'].") and pwa_estado='P'; ";
			} else {
				$sqlB="";
			}
			// $sqlB="update pedido set is_printer = 1 where idpedido in(".$_POST['idpedido'].")";
			$bd->xMultiConsulta($sqlA.$sqlB);
			break;
		case '301': //eliminar todos los pedidos con error
			$sql="update print_server_detalle set estado=1 where idprint_server_detalle in (".$_POST['id'].")";
			$bd->xConsulta_NoReturn($sql);
			break;
		case '302': //guardar error
			$sql="update print_server_detalle set error=1, impreso = 0 where idprint_server_detalle=".$_POST['id'];
			$bd->xConsulta_NoReturn($sql);
			break;
		case '4': // list estructuras
			$sql="SELECT nom_documento, v, estructura_json FROM print_server_estructura where estado=0";
			$bd->xConsulta($sql);			
			break;
		case '5':// logo bits
			$sql = "SELECT logo64 FROM sede where idsede=$idsede";
			$logo = $bd->xDevolverUnDato($sql);	
			echo $logo;
			break;
	}

?>
<?php
//require_once 'H:\inetpub\lib\ESB\_dev_\sqlsrvLibFL2noBB.php';
require_once 'H:\inetpub\lib\sqlsrvLibFL2NewBB.php';
require_once('H:\inetpub\lib\switchConnMQ.inc');
ini_set("error_log", "./log/QAdashBoardError.txt");

$connDB = new connDB();
$handle242 = $connDB->handle242;
$handleMQ = connectMSQ(); 
$handleBB  = connectBB();

$fp = fopen("./log/getPlansByStartDate3.txt", "w+");
$dateStr = date('Y-m-d H:i:s'); fwrite($fp, " \r\n \r\n dev version ".$dateStr ."\r\n");
$handle242  = $connDB->handle242;

$body = @file_get_contents('php://input');            // Get parameters from calling cURL POST;
$bodyObj = json_decode($body);
fwrite($fp, "\r\n bodyObj is \r\n " );
ob_start(); var_dump($body);$data = ob_get_clean();fwrite($fp, "\r\n inpData is  \r\n ". $data);                         // Create pretty form of data
fwrite($fp, $s ."\r\n");                              // Write out the data to the log
$user_ip = getenv('REMOTE_ADDR');
fwrite($fp, "\r\n 1414 user addr is ". $user_ip);
$wkDir = getcwd();                                    // get working directory

if (is_array($bodyObj))
  $selStr = "SELECT * FROM QAD_workdays6 where StartDate > '".$bodyObj[0]."' AND StartDate < '".$bodyObj[1]."'";
else
  $selStr = "SELECT * FROM QAD_workdays6 WHERE StartDate > '".$bodyObj->startDate."' AND StartDate < '".$bodyObj->endDate."'";
$debug = $_GET['debug'] == '1' ? true : false;
if ($debug){
  $selStr = "SELECT * FROM QAD_workdays6 WHERE StartDate > '2023-01-01' AND StartDate < '2023-01-05'";
  echo "<br> $selStr <br> <br>";
}
//$selStr = "SELECT * FROM QAD_workdays2 ";

fwrite($fp, "\r\n 4141 selStr is ".$selStr ."\r\n");
//$dB = new getDBData($selStr, $handleBBDas);
//dB = new getDBData($selStr, $handle242);
$dB = new getDBData($selStr, $handleBB);
$i = 0; $sKey = 0;
$MDNames = Array();
while ($assoc = $dB->getAssoc()){
  if ($assoc['planIdx'] == '106807'){
    fwrite($fp, "\r\n  Found 106807");
    $wstr = print_r($assoc, true); fwrite($fp, $wstr); fwrite($fp, "\r\n $i \r\n ");
  }
  if ($assoc['Modality'] == 'TBI')
    continue;
  if ( strcasecmp($assoc['Modality'], 'XSBRTs') == 0)
    continue;
  foreach ($assoc as $key => $val){
    if (is_object($val)){
        $assoc[$key] = $val->format("Y-m-d");   
    }
    $assoc['verdict'] = '';
  }
  $rData[0][$i++] = $assoc;
  $MDNames[$assoc['MDKey']] = $assoc['LastName'];
  $rData[0]['service'][$assoc['SiteDesc']] = $assoc['SiteDesc'];
}
fwrite($fp, "\r\n  $i plans retrieved \r\n");

  $selStr = "SELECT * from QAdetail";
  $dB = new getDBData($selStr, $handleBB);
  $i = 0;
  while ($assoc = $dB->getAssoc()){
    $row[$i++] = $assoc['PlanIdx'];
  }
$rData['QAdetail'] = $row;                                                                  // this is the data from ION

$selStr = "SELECT
    MAX(case when intakeFldName = 'patUnitNumber' then value end) patUnitNumber
    FROM intakeResponses AS IR
    JOIN intakeForm AS INF ON IR.formID = INF.formID
    WHERE IR.valid=1
    AND INF.valid =1              
    GROUP BY IR.formID, INF.createWhen
    HAVING MAX(case when intakeFldName = 'isThisUrgent' then value end) = '1'
    ORDER BY IR.formID DESC";
$dB = new getDBData($selStr, $handle242);
$urgent = Array();
while ($assoc = $dB->getAssoc()){
  array_push($urgent,str_replace("-", "", $assoc['patUnitNumber']));
}
$rData['dates'] = $bodyObj;
$rData['MDNames'] = $MDNames;
$rData['overrides'] = getOverrides();
$rData['urgent'] = $urgent;
$rData['reasons'] =  getReasons();
$rData['locations'] = getMDLocations();
$rData['inst'] = getInsts();
//ob_start(); var_dump($rData);$data = ob_get_clean();fwrite($fp, "\r\n MDNames is  \r\n ". $data);
if ($debug){
  echo "<pre>"; print_r($rData); echo "</pre>";
}
$rData2[0] = $rData;
$rData2[1] = getFromNewData();
$output = json_encode($rData2);
echo $output;  

exit();
function getFromNewData(){
  global $bodyObj, $fp, $handleBB;
  if (is_array($bodyObj))
  $selStr = "SELECT * FROM QADWorkdaysSpec6 where StartDateDate >= '".$bodyObj[0]."' AND StartDateDate < '".$bodyObj[1]."'";
else
  $selStr = "SELECT * FROM QADWorkdaysSpec6 WHERE StartDateDate >= '".$bodyObj->startDate."' AND StartDate < '".$bodyObj->endDate."'";
  fwrite($fp, "\r\n newPplans selStr is \r\n $selStr");
  $stmt = sqlsrv_query( $handleBB, $selStr );
  $i = 0;
  if( $stmt === false ) {
    if( ($errors = sqlsrv_errors() ) != null) {
        foreach( $errors as $error ) {
            fwrite($fp, "SQLSTATE: ".$error[ 'SQLSTATE']."\r\n");
            fwrite($fp, "message: ".$error[ 'message']."\r\n");
        }
    }
  }
  if ( !sqlsrv_has_rows( $stmt )) 
    fwrite($fp, "\r\n newPlans nothing found");
    $i = 0;   
    while( $rowR = sqlsrv_fetch_array( $stmt, SQLSRV_FETCH_ASSOC) ) {
      $plans[$i++] = $rowR;
    }
  fwrite($fp, "\r\n  $i  new Plans plans retrieved \r\n");
  
    $selStr = "SELECT * from QAdetail";                     // ad hoc revisions by Lois
    $dB = new getDBData($selStr, $handleBB);
    $i = 0;
    while ($assoc = $dB->getAssoc()){
      $row[$i++] = $assoc['PlanIdx'];
    }
  $rData['QAdetail'] = $row;                                                                  // this is the data from ION
  
  $selStr = "SELECT
      MAX(case when intakeFldName = 'patUnitNumber' then value end) patUnitNumber
      FROM intakeResponses AS IR
      JOIN intakeForm AS INF ON IR.formID = INF.formID
      WHERE IR.valid=1
      AND INF.valid =1              
      GROUP BY IR.formID, INF.createWhen
      HAVING MAX(case when intakeFldName = 'isThisUrgent' then value end) = '1'
      ORDER BY IR.formID DESC";
  $dB = new getDBData($selStr, $handle242);
  $urgent = Array();
  while ($assoc = $dB->getAssoc()){
    array_push($urgent,str_replace("-", "", $assoc['patUnitNumber']));
  }
  $rData['plans'] = $plans;
  $rData['dates'] = $bodyObj;
  $rData['MDNames'] = $MDNames;
  $rData['overrides'] = getOverrides();
  $rData['urgent'] = $urgent;
  $rData['reasons'] =  getReasons();
  $rData['locations'] = getMDLocations();
  $rData['inst'] = getInsts();
  return $rData;
}                                     // end of get FRom WorkdaySpec
function getInsts(){
  global $handleBB;
  $selStr = "SELECT inst_id,  short_name FROM institution";
  $dB = new getDBData($selStr, $handleBB);
  while ($assoc = $dB->getAssoc())
    $InstIds[$assoc['inst_id']] = $assoc['short_name'];
  return $InstIds;  
}
function getMDLocations(){
  global $handleBB;
  $selStr = "SELECT UserKey, instID FROM physicians ";
  $dB = new getDBData($selStr, $handleBB);
  while ($assoc = $dB->getAssoc())
    $InstIds[$assoc['UserKey']] = $assoc['instID'];
  return $InstIds;  
}
/**
 * Get Reasons from rework
 */
function getReasons(){
  global $handleBB, $fp;
  $selStr = "SELECT
	rework.idx, rework.ReasonTxt, rework.ReasonIdx
FROM
	dbo.rework";
  $dB = new getDBData($selStr, $handleBB);
  fwrite($fp, "\r\n $selStr");
  if (!$dB)
  fwrite($fp, 'MSSQL error: ' . mssql_get_last_message());
else 
  {
  //  ob_start(); var_dump($dB);$data = ob_get_clean();fwrite($fp, "\r\n ". $data);
  }
  while($assoc = $dB->getAssoc())
        $row[$assoc['ReasonIdx']] = $assoc['ReasonTxt'];
  return $row;
}

/**
 * Get ALL overrides from QAdetail, returs  PlanIdx -> OverRideIdx = ReasonIdx
 */
function getOverrides(){
  global $handleBB, $fp;
  $selStr = "SELECT
	QAdetail.idx, 
	QAdetail.PlanIdx, 
	QAdetail.ReasonIdx, 
	QAdetail.UnitNumber, 
	QAdetail.del
FROM
	dbo.QAdetail
ORDER BY
	QAdetail.idx";
  fwrite($fp, "\r\n $selStr \r\n");
  $dB = new getDBData($selStr, $handleBB);
  if (!$dB)
    fwrite($fp, 'MSSQL error: ' . mssql_get_last_message());
  else 
    {
    //  ob_start(); var_dump($dB);$data = ob_get_clean();fwrite($fp, "\r\n ". $data);
    }
  while($assoc = $dB->getAssoc())
  {
        $row[$assoc['PlanIdx']] = $assoc;
  }
  return $row;
}
function selectFromMQTest($firstDate, $secondDate){
  global $handleMQ, $lF, $fp, $fileName;
  $Pat_Id1 = getMQiD('1');
$selStr = "SELECT  Sch_Id, Sch_Set_Id, App_DtTm, Location, Version, Create_DtTm, Edit_DtTm, CHG_ID, Notes, Pat_ID1, SchStatus_Hist_SD, SchStatus_Hist_UD
  FROM Schedule 
  WHERE Pat_Id1 = '$Pat_Id1' 
   AND Version = '0'
  ORDER By Sch_Set_Id, Sch_Id" ;
$dB = new getDBData($selStr, $handleMQ);
echo "<br> 177 <br>"; var_dump($dB);
while ($assoc = $dB->getAssoc()){
  echo "<pre>"; print_r($assoc); echo "</pre>";
}
}
function getMQiD($mrn){
  global $handleMQ;
  $selStr = "SELECT top(1) Pat_Id1, IDA FROM Ident WHERE IDA = '".$_GET['mrn']."'"; // get the MRN = IDA from the MQ Ident table
  $Pat_Id1 = getSingle($selStr, 'Pat_Id1', $handleMQ);
  echo "<br> $selStr <br>";
  echo "<br> 186 <br>"; var_dump($Pat_Id1);
  return $Pat_Id1;
}
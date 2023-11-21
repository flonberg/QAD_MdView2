<?php
require_once 'H:\inetpub\lib\esb\_dev_\sqlsrvLibFL.php';
ini_set("error_log", "./log/getUserInfoError.txt");
$fp = fopen("./log/getUserInfo.txt", "a+");
$dateStr = date('Y-m-d H:i:s'); fwrite($fp, " dev version ".$dateStr ."\r\n");

$handleBB  = connectBB();
$handleBBDas = $connDB->handleBB;
$handle242 = connectDB_FL();

$body = @file_get_contents('php://input');            // Get parameters from calling cURL POST;
$bodyObj = json_decode(($body));
$s = print_r($bodyObj, true); fwrite($fp, "\r\n\ input date is \r\n");  fwrite($fp, $s ."\r\n");  
$selStr = "SELECT UserKey from users WHERE UserID = '".$bodyObj."'";

$UserKey = getSingle("SELECT UserKey from users WHERE UserID = '".$bodyObj."'", "UserKey", $handle242);
$UserLastName = getSingle("SELECT LastName from physicians WHERE UserKey = '".$UserKey."'", "LastName", $handle242);
$UserPriv = getSingle("SELECT Priviledge from priviledge WHERE UserId = '".$bodyObj."'", "Priviledge", $handleBB);
$ViewAll = getSingle("SELECT UserKey FROM QAD_ViewAll WHERE UserId = '".$bodyObj."'", "UserKey", $handleBB);
ob_start(); var_dump($UserLastName);$data = ob_get_clean();fwrite($fp, "\r\n MDNames is  \r\n ". $data);
$ret = array('UserKey' => $UserKey, 'UserLastName'=>$UserLastName, 'Privilege'=>$UserPriv);
$ret['ViewAll'] = $ViewAll > 0 ? $ViewAll : '0';
/*if (isset($ViewAll) && $ViewAll > 0 )
    $ret['ViewAll'] = '0';
else
    $ret['ViewAll'] = '1';   
    */ 
ob_start(); var_dump($ret);$data = ob_get_clean();fwrite($fp, "\r\n ret is  \r\n ". $data);
$dSTr = print_r($ret, true); fwrite($fp, $dStr);
echo json_encode($ret);

<?php
require_once 'H:\inetpub\lib\esb\_dev_\sqlsrvLibFL.php';
require_once('H:\inetpub\lib\switchConnMQ.inc');
ini_set("error_log", "./log/getUserKeyError.txt");

$handle242 = connectDB_FL();
$selStr = "SELECT UserKey FROM users WHERE UserID = '".$_GET['userid']."'";
$dB = new getDBData($selStr, $handle242);
$assoc = $dB->getAssoc();
$ret = json_encode($assoc)
echo $ret; 

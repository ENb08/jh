<?php

require_once 'db.php';

session_destroy();

header('Location: ../../index.html');
exit;
?>
-- MySQL dump 10.13  Distrib 5.6.26, for osx10.10 (x86_64)
--
-- Host: localhost    Database: vecsgardenia2015
-- ------------------------------------------------------
-- Server version	5.6.26

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `oc_order_status`
--

DROP TABLE IF EXISTS `oc_order_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `oc_order_status` (
  `order_status_id` int(11) NOT NULL AUTO_INCREMENT,
  `language_id` int(11) NOT NULL,
  `name` varchar(32) NOT NULL,
  PRIMARY KEY (`order_status_id`,`language_id`)
) ENGINE=MyISAM AUTO_INCREMENT=61 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `oc_order_status`
--

LOCK TABLES `oc_order_status` WRITE;
/*!40000 ALTER TABLE `oc_order_status` DISABLE KEYS */;
INSERT INTO `oc_order_status` VALUES (3,1,'Shipped'),(5,1,'Complete'),(10,1,'Failed'),(3,2,'Shipped'),(5,2,'Complete'),(10,2,'Failed'),(17,2,'已付款(超商取貨)'),(18,2,'刷卡確認中(超商取貨)'),(19,2,'出貨準備中'),(19,1,'Preparing'),(20,2,'已出貨 (信用卡付款)'),(21,2,'完成交易(宅配付款)'),(17,1,'已付款(超商取貨)'),(28,2,'已出貨(超商付款)'),(29,2,'完成交易(信用卡付款)'),(18,1,'刷卡確認中(超商取貨)'),(49,1,'訂單確認中(信用卡，宅配到府)'),(31,2,'訂單確認中(超商付款取貨)'),(32,2,'已出貨(貨到付款)'),(34,2,'完成交易(超商付款)'),(28,1,'已出貨(超商付款)'),(20,1,'已出貨 (信用卡付款)'),(32,1,'已出貨(貨到付款)'),(35,2,'已付款(配送到府)'),(36,2,'訂單確認中(實體ATM)'),(37,2,'訂單確認中(線上ATM)'),(37,1,'訂單確認中(線上ATM)'),(38,2,'已付款(實體ATM)'),(39,2,'已付款(線上ATM)'),(40,2,'已出貨(ATM)'),(41,2,'已付款 (禮品券)'),(42,2,'已出貨(禮品券)'),(49,2,'訂單確認中(信用卡，宅配到府)'),(43,2,'貨到付款確認中(配送到府)'),(43,1,'貨到付款確認中(配送到府)'),(34,1,'完成交易(超商付款)'),(21,1,'完成交易(宅配付款)'),(29,1,'完成交易(信用卡付款)'),(41,1,'已付款 (禮品券)'),(38,1,'已付款(實體ATM)'),(39,1,'已付款(線上ATM)'),(35,1,'已付款(配送到府)'),(40,1,'已出貨(ATM)'),(42,1,'已出貨(禮品券)'),(36,1,'訂單確認中(實體ATM)'),(31,1,'訂單確認中(超商付款取貨)'),(48,1,'訂單確認中(信用卡，超商取貨)'),(45,2,'已退回，超取未取'),(45,1,'已退回，超取未取'),(46,2,'已退回，宅配未取'),(46,1,'已退回，宅配未取'),(48,2,'訂單確認中(信用卡，超商取貨)'),(50,2,'NEW 超商取貨確認中'),(51,2,'NEW 送貨到府確認中'),(52,2,'NEW 海外配送確認中'),(52,1,'NEW 海外配送確認中'),(50,1,'NEW 超商取貨確認中'),(51,1,'NEW 送貨到府確認中'),(53,2,'NEW 送貨到府，信用卡確認中'),(53,1,'NEW 送貨到府，信用卡確認中'),(54,2,'NEW 送貨到府，信用卡成功'),(54,1,'NEW 送貨到府，信用卡成功'),(55,2,'NEW 送貨到府，貨到付款成功'),(55,1,'NEW 送貨到府，貨到付款成功'),(56,2,'NEW 超商取貨，信用卡確認中'),(56,1,'NEW 超商取貨，信用卡確認中'),(57,2,'NEW 超商取貨，信用卡成功'),(57,1,'NEW 超商取貨，信用卡成功'),(58,2,'NEW 超商取貨，超商付現成功'),(58,1,'NEW 超商取貨，超商付現成功'),(59,2,'NEW 海外配送，信用卡確認中'),(59,1,'NEW 海外配送，信用卡確認中'),(60,2,'NEW 海外配送，信用卡成功'),(60,1,'NEW 海外配送，信用卡成功');
/*!40000 ALTER TABLE `oc_order_status` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2016-08-01 14:31:14

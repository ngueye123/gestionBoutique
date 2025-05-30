-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : ven. 30 mai 2025 à 08:39
-- Version du serveur : 8.0.31
-- Version de PHP : 8.0.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `gestionboutique`
--

-- --------------------------------------------------------

--
-- Structure de la table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `products`
--

DROP TABLE IF EXISTS `products`;
CREATE TABLE IF NOT EXISTS `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reference` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int NOT NULL,
  `category` varchar(255) NOT NULL,
  `min_stock` int NOT NULL,
  `utilisateur_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reference` (`reference`),
  KEY `fk_produits_utilisateur` (`utilisateur_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `products`
--

INSERT INTO `products` (`id`, `reference`, `name`, `price`, `stock`, `category`, `min_stock`, `utilisateur_id`) VALUES
(3, 'REF004', 'Pull en laine', '49.00', 26, 'Vêtements', 5, 9),
(4, 'REF006', 'Pull en laine', '49.00', 15, 'Vêtements', 5, 9),
(5, 'test', 'test', '4.00', 5, 'test', 3, 1),
(6, 'REF001', 'jean', '6.00', 12, 'vetement', 4, 1),
(7, 'REF005', 'Nouveau nom', '99.99', 70, 'Nouvelle catégorie', 10, 1),
(8, 'REF009', 'Pull en laine', '49.00', 20, 'Vêtements', 5, 1),
(9, 'REF003', 'test', '2.00', 4, 'test', 6, 1),
(12, 'REF0100', 'Nouveau nom', '49.99', 200, 'Nouvelle catégorie', 10, 0),
(13, 'REF00200', 'jean', '0.07', 10, 'vetement', 5, 9),
(15, 'REF010000', 'Nouveau nom', '49.99', 2, 'Nouvelle catégorie', 10, 9);

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `utilisateurs`
--

DROP TABLE IF EXISTS `utilisateurs`;
CREATE TABLE IF NOT EXISTS `utilisateurs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `mot_de_passe` varchar(500) NOT NULL,
  `role` enum('admin','utilisateur') DEFAULT 'utilisateur',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `utilisateurs`
--

INSERT INTO `utilisateurs` (`id`, `nom`, `prenom`, `email`, `mot_de_passe`, `role`) VALUES
(9, 'Gueye', 'Ndiaga', 'ndiaga@gmail.com', '$2y$12$9BsZGNnqzJd7zeOTNVd5a.qxb/BquiVZe/TGKeE1wc11DTKWr1IxW', 'utilisateur'),
(2, 'Dupont', 'Jean', 'jean.dupont@example.com', '$2y$12$x4DM4BATaubNPCIADNKbcuRaWHxGVMBzuaqqEfp4DvxIxdnZcD8Vu', 'utilisateur'),
(3, 'test', 'Jean', 'test@example.com', '$2y$12$H2bsA0spyuQTuobvcMvGP.sNmgOv9m9qC3mov2lcaiPvZFqaN58Fy', 'utilisateur'),
(4, 'Dupont', 'Jean', 'test.dupont@example.com', '$2y$12$r0zdqntbx5jNDRmswTiTbO08OwlasCLJMuEnOflxEQSQRWz5aHB4S', 'utilisateur'),
(5, 'test', 'Jean', 'vvtest@example.com', '$2y$12$nxHZhUCCBKiO50xT7VnmcOTyVFswxAvZJgBzEhWW9Ba4aNjCMLkxK', 'utilisateur'),
(6, 'test', 'Jean', 'vvvtest@example.com', '$2y$12$aow67DIuQCMkJ907rN/82uWEzTsvjP1Sl/.iQ8.o.oyijKOsnkHxS', 'utilisateur'),
(7, 'test', 'Jean', 'vvvtvest@example.com', '$2y$12$QBXZfvH3yh0G.cs.FNnbOORYZ3uOHoTNLn5IR1NkugPHAe83UUeZm', 'utilisateur'),
(8, 'Dupont', 'Jean', 'testjy.dupont@example.com', '$2y$12$3k.AwEanapzcPyDZHgtq.ehFrJN0xpZo8hkjPlonworuuFgigTMCy', 'utilisateur'),
(10, 'toto', 'titi', 'ndiagatest@gmail.com', '$2y$12$AT3Y0TEzWr5wZVLkrlmXc.YfELkS2P0k/MEEIRxHecuXzpTVP7t2.', 'utilisateur');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

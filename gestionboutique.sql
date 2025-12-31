-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost:3306
-- Généré le : sam. 22 nov. 2025 à 11:27
-- Version du serveur : 10.11.13-MariaDB-0ubuntu0.24.04.1
-- Version de PHP : 8.3.6

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
-- Structure de la table `employes`
--

CREATE TABLE `employes` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mot_de_passe` varchar(500) NOT NULL,
  `role` enum('admin','vendeur','caissier') NOT NULL DEFAULT 'vendeur',
  `utilisateur_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `employes`
--

INSERT INTO `employes` (`id`, `nom`, `email`, `mot_de_passe`, `role`, `utilisateur_id`) VALUES
(5, 'wqhiswql', 'ndiagagueye@gmail.com', '$2y$10$JpfdQ/wHc37Gu9Qn/uTwROte5za.k5SYdVl8.32VqXUEhfnQVORMC', 'vendeur', 9);

-- --------------------------------------------------------

--
-- Structure de la table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '2025_03_04_095231_create_personal_access_tokens_table', 1);

-- --------------------------------------------------------

--
-- Structure de la table `password_resets_utilisateurs`
--

CREATE TABLE `password_resets_utilisateurs` (
  `id` int(10) UNSIGNED NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `reference` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL,
  `category` varchar(255) NOT NULL,
  `min_stock` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `products`
--

INSERT INTO `products` (`id`, `reference`, `name`, `price`, `stock`, `category`, `min_stock`, `utilisateur_id`) VALUES
(3, 'REF004', 'Pull en laine', 49.00, 20, 'Vêtements', 5, 9),
(4, 'REF006', 'Pull en laine', 49.00, 12, 'Vêtements', 5, 9),
(5, 'test', 'test', 4.00, 5, 'test', 3, 5),
(6, 'REF001', 'jean', 6.00, 12, 'vetement', 4, 5),
(7, 'REF005', 'Nouveau nom', 99.99, 70, 'Nouvelle catégorie', 10, 1),
(8, 'REF009', 'Pull en laine', 49.00, 20, 'Vêtements', 5, 1),
(9, 'REF003', 'test', 2.00, 4, 'test', 6, 1),
(12, 'REF0100', 'Nouveau nom', 49.99, 200, 'Nouvelle catégorie', 10, 0),
(13, 'REF00200', 'jean', 0.07, 10, 'vetement', 5, 9),
(15, 'REF010000', 'Nouveau nom', 49.99, 2, 'Nouvelle catégorie', 10, 9);

-- --------------------------------------------------------

--
-- Structure de la table `utilisateurs`
--

CREATE TABLE `utilisateurs` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `verification_token` varchar(100) DEFAULT NULL,
  `mot_de_passe` varchar(500) NOT NULL,
  `role` enum('admin','utilisateur') DEFAULT 'utilisateur'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `utilisateurs`
--

INSERT INTO `utilisateurs` (`id`, `nom`, `prenom`, `email`, `email_verified_at`, `verification_token`, `mot_de_passe`, `role`) VALUES
(2, 'Dupont', 'Jean', 'jean.dupont@example.com', NULL, NULL, '$2y$12$x4DM4BATaubNPCIADNKbcuRaWHxGVMBzuaqqEfp4DvxIxdnZcD8Vu', 'utilisateur'),
(3, 'test', 'Jean', 'test@example.com', NULL, NULL, '$2y$12$H2bsA0spyuQTuobvcMvGP.sNmgOv9m9qC3mov2lcaiPvZFqaN58Fy', 'utilisateur'),
(5, 'Dupont', 'Jean', 'test.dupont@example.com', NULL, NULL, '$2y$12$r0zdqntbx5jNDRmswTiTbO08OwlasCLJMuEnOflxEQSQRWz5aHB4S', 'utilisateur'),
(6, 'test', 'Jean', 'vvvtest@example.com', NULL, NULL, '$2y$12$aow67DIuQCMkJ907rN/82uWEzTsvjP1Sl/.iQ8.o.oyijKOsnkHxS', 'utilisateur'),
(7, 'test', 'Jean', 'vvvtvest@example.com', NULL, NULL, '$2y$12$QBXZfvH3yh0G.cs.FNnbOORYZ3uOHoTNLn5IR1NkugPHAe83UUeZm', 'utilisateur'),
(8, 'Dupont', 'Jean', 'testjy.dupont@example.com', NULL, NULL, '$2y$12$3k.AwEanapzcPyDZHgtq.ehFrJN0xpZo8hkjPlonworuuFgigTMCy', 'utilisateur'),
(9, 'Gueye', 'Ndiaga', 'ndiaga@gmail.com', '2025-10-08 09:08:52', NULL, '$2y$12$9BsZGNnqzJd7zeOTNVd5a.qxb/BquiVZe/TGKeE1wc11DTKWr1IxW', 'utilisateur'),
(10, 'toto', 'titi', 'ndiagatest@gmail.com', NULL, NULL, '$2y$12$AT3Y0TEzWr5wZVLkrlmXc.YfELkS2P0k/MEEIRxHecuXzpTVP7t2.', 'utilisateur'),
(12, 'sddoid', 'dfsda', 'ndiagagueye605@gmail.com', '2025-10-30 14:52:40', NULL, '$2y$12$uUEx2fvZ2ENP35gdG8Xiv.5Nd2hbXpUJb5Wzk5QzovvjDaWSgq7jS', 'utilisateur');

-- --------------------------------------------------------

--
-- Structure de la table `ventes`
--

CREATE TABLE `ventes` (
  `id` int(10) UNSIGNED NOT NULL,
  `reference` varchar(50) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `employe_id` int(11) DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `moyen_paiement` enum('especes','wave','orange_money','carte') NOT NULL DEFAULT 'especes',
  `montant_recu` decimal(10,2) DEFAULT NULL,
  `monnaie` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `ventes`
--

INSERT INTO `ventes` (`id`, `reference`, `utilisateur_id`, `employe_id`, `total`, `moyen_paiement`, `montant_recu`, `monnaie`, `created_at`, `updated_at`) VALUES
(1, 'VT-20250130-001', 9, NULL, 150.00, 'especes', NULL, NULL, '2025-10-23 08:57:18', '2025-10-30 09:57:18'),
(2, 'VT-20250130-002', 9, NULL, 250.50, 'wave', NULL, NULL, '2025-10-24 08:57:18', '2025-10-30 09:57:18'),
(3, 'VT-20250130-003', 9, NULL, 180.00, 'especes', NULL, NULL, '2025-10-25 08:57:18', '2025-10-30 09:57:18'),
(4, 'VT-20250130-004', 9, NULL, 320.00, 'carte', NULL, NULL, '2025-10-26 09:57:18', '2025-10-30 09:57:18'),
(5, 'VT-20250130-005', 9, NULL, 95.50, 'especes', NULL, NULL, '2025-10-27 09:57:18', '2025-10-30 09:57:18'),
(6, 'VT-20250130-006', 9, NULL, 450.00, 'orange_money', NULL, NULL, '2025-10-28 09:57:18', '2025-10-30 09:57:18'),
(7, 'VT-20250130-007', 9, NULL, 280.00, 'especes', NULL, NULL, '2025-10-29 09:57:18', '2025-10-30 09:57:18'),
(8, 'VT-20250130-008', 9, NULL, 190.00, 'wave', NULL, NULL, '2025-10-30 09:57:18', '2025-10-30 09:57:18'),
(13, 'VT-20251030-0002', 9, NULL, 147.00, 'especes', 200.00, 53.00, '2025-10-30 11:41:46', '2025-10-30 11:41:46'),
(14, 'VT-20251030-0003', 9, NULL, 196.99, 'especes', 200.00, 3.01, '2025-10-30 11:44:30', '2025-10-30 11:44:30'),
(15, 'VT-20251030-0004', 9, NULL, 49.99, 'wave', 49.99, 0.00, '2025-10-30 11:45:13', '2025-10-30 11:45:13'),
(16, 'VT-20251030-0005', 9, NULL, 49.99, 'orange_money', 49.99, 0.00, '2025-10-30 11:54:11', '2025-10-30 11:54:11'),
(17, 'VT-20251030-0006', 9, NULL, 98.99, 'especes', 99.00, 0.01, '2025-10-30 12:58:23', '2025-10-30 12:58:23'),
(18, 'VT-20251030-0007', 9, NULL, 98.00, 'carte', 98.00, 0.00, '2025-10-30 16:21:06', '2025-10-30 16:21:06');

-- --------------------------------------------------------

--
-- Structure de la table `ventes_details`
--

CREATE TABLE `ventes_details` (
  `id` int(10) UNSIGNED NOT NULL,
  `vente_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(11) NOT NULL,
  `reference_produit` varchar(50) NOT NULL,
  `nom_produit` varchar(255) NOT NULL,
  `quantite` int(11) NOT NULL,
  `prix_unitaire` decimal(10,2) NOT NULL,
  `sous_total` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `ventes_details`
--

INSERT INTO `ventes_details` (`id`, `vente_id`, `product_id`, `reference_produit`, `nom_produit`, `quantite`, `prix_unitaire`, `sous_total`) VALUES
(1, 13, 3, 'REF004', 'Pull en laine', 2, 49.00, 98.00),
(2, 13, 4, 'REF006', 'Pull en laine', 1, 49.00, 49.00),
(3, 14, 3, 'REF004', 'Pull en laine', 2, 49.00, 98.00),
(4, 14, 4, 'REF006', 'Pull en laine', 1, 49.00, 49.00),
(5, 14, 17, 'REF0103400099', 'Nouveau nom', 1, 49.99, 49.99),
(6, 15, 17, 'REF0103400099', 'Nouveau nom', 1, 49.99, 49.99),
(7, 16, 17, 'REF0103400099', 'Nouveau nom', 1, 49.99, 49.99),
(8, 17, 3, 'REF004', 'Pull en laine', 1, 49.00, 49.00),
(9, 17, 17, 'REF0103400099', 'Nouveau nom', 1, 49.99, 49.99),
(10, 18, 3, 'REF004', 'Pull en laine', 1, 49.00, 49.00),
(11, 18, 4, 'REF006', 'Pull en laine', 1, 49.00, 49.00);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_ventes_journalieres`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `v_ventes_journalieres` (
`date` date
,`utilisateur_id` int(11)
,`nombre_ventes` bigint(21)
,`chiffre_affaires` decimal(32,2)
,`panier_moyen` decimal(14,6)
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_ventes_mensuelles`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `v_ventes_mensuelles` (
`mois` varchar(7)
,`utilisateur_id` int(11)
,`nombre_ventes` bigint(21)
,`chiffre_affaires` decimal(32,2)
,`panier_moyen` decimal(14,6)
);

-- --------------------------------------------------------

--
-- Structure de la vue `v_ventes_journalieres`
--
DROP TABLE IF EXISTS `v_ventes_journalieres`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_ventes_journalieres`  AS SELECT cast(`ventes`.`created_at` as date) AS `date`, `ventes`.`utilisateur_id` AS `utilisateur_id`, count(0) AS `nombre_ventes`, sum(`ventes`.`total`) AS `chiffre_affaires`, avg(`ventes`.`total`) AS `panier_moyen` FROM `ventes` GROUP BY cast(`ventes`.`created_at` as date), `ventes`.`utilisateur_id` ;

-- --------------------------------------------------------

--
-- Structure de la vue `v_ventes_mensuelles`
--
DROP TABLE IF EXISTS `v_ventes_mensuelles`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_ventes_mensuelles`  AS SELECT date_format(`ventes`.`created_at`,'%Y-%m') AS `mois`, `ventes`.`utilisateur_id` AS `utilisateur_id`, count(0) AS `nombre_ventes`, sum(`ventes`.`total`) AS `chiffre_affaires`, avg(`ventes`.`total`) AS `panier_moyen` FROM `ventes` GROUP BY date_format(`ventes`.`created_at`,'%Y-%m'), `ventes`.`utilisateur_id` ;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `employes`
--
ALTER TABLE `employes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employes_email_unique` (`email`),
  ADD KEY `employes_utilisateur_id_index` (`utilisateur_id`);

--
-- Index pour la table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `password_resets_utilisateurs`
--
ALTER TABLE `password_resets_utilisateurs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `password_resets_email_index` (`email`);

--
-- Index pour la table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Index pour la table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`);

--
-- Index pour la table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_reference_per_user` (`reference`,`utilisateur_id`),
  ADD KEY `fk_produits_utilisateur` (`utilisateur_id`);

--
-- Index pour la table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `ventes`
--
ALTER TABLE `ventes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference` (`reference`),
  ADD KEY `idx_utilisateur_id` (`utilisateur_id`),
  ADD KEY `idx_employe_id` (`employe_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_date_utilisateur` (`created_at`,`utilisateur_id`),
  ADD KEY `idx_moyen_paiement` (`moyen_paiement`);

--
-- Index pour la table `ventes_details`
--
ALTER TABLE `ventes_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vente_id` (`vente_id`),
  ADD KEY `idx_product_id` (`product_id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `employes`
--
ALTER TABLE `employes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `password_resets_utilisateurs`
--
ALTER TABLE `password_resets_utilisateurs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT pour la table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT pour la table `ventes`
--
ALTER TABLE `ventes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT pour la table `ventes_details`
--
ALTER TABLE `ventes_details`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `ventes`
--
ALTER TABLE `ventes`
  ADD CONSTRAINT `fk_ventes_utilisateur` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `ventes_details`
--
ALTER TABLE `ventes_details`
  ADD CONSTRAINT `fk_ventes_details_vente` FOREIGN KEY (`vente_id`) REFERENCES `ventes` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

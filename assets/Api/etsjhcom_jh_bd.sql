-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : lun. 15 déc. 2025 à 06:32
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `etsjhcom_jh_bd`
--

-- --------------------------------------------------------

--
-- Structure de la table `appro_magasin`
--

CREATE TABLE `appro_magasin` (
  `id_appro` int(15) NOT NULL,
  `id_produit` int(15) NOT NULL,
  `id_session` int(15) NOT NULL,
  `quantite` int(15) NOT NULL,
  `provenance` varchar(50) DEFAULT 'Stock Principal',
  `notes` text DEFAULT NULL,
  `date_appro` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `appro_magasin`
--

INSERT INTO `appro_magasin` (`id_appro`, `id_produit`, `id_session`, `quantite`, `provenance`, `notes`, `date_appro`) VALUES
(1, 1, 900277327, 40, 'Stock Principal', '', '2025-12-14 18:39:05'),
(2, 2, 900277327, 20, 'Stock Principal', 'lune', '2025-12-14 19:05:09');

-- --------------------------------------------------------

--
-- Structure de la table `entree_stock`
--

CREATE TABLE `entree_stock` (
  `id_produit` int(15) NOT NULL,
  `id_session` int(15) NOT NULL,
  `quantite` int(15) NOT NULL,
  `numero_reference` int(15) NOT NULL,
  `notes` varchar(40) NOT NULL,
  `date_entree` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `entree_stock`
--

INSERT INTO `entree_stock` (`id_produit`, `id_session`, `quantite`, `numero_reference`, `notes`, `date_entree`) VALUES
(1, 900277327, 10, 0, 'HGGGGGGGGGGGGGGGGG', '2025-12-10 18:4'),
(2, 900277327, 20, 0, 'qqqqqqqqqqqhuVJQVDKVKYDYYAUUYUAUUYA', '2025-12-14 05:0'),
(1, 900277327, 40, 0, 'eeeeeeeddddddddddddddddddddd', '2025-12-14 18:1'),
(1, 900277327, 20, 0, 'dddddddddddddddd', '2025-12-14 19:0');

-- --------------------------------------------------------

--
-- Structure de la table `magasin`
--

CREATE TABLE `magasin` (
  `nom_magasin` varchar(30) NOT NULL,
  `adresse` varchar(59) NOT NULL,
  `numero_magasin` int(12) NOT NULL,
  `id_magasin` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `magasin`
--

INSERT INTO `magasin` (`nom_magasin`, `adresse`, `numero_magasin`, `id_magasin`) VALUES
('magasin_1', 'aaaaaaaaaa/gggggggggggggg/lllllllllllllllllllllllll', 974595419, 1);

-- --------------------------------------------------------

--
-- Structure de la table `magasin_stock`
--

CREATE TABLE `magasin_stock` (
  `id_magasin_stock` int(15) NOT NULL,
  `id_produit` int(15) NOT NULL,
  `id_session` int(15) NOT NULL,
  `quantite_magasin` int(15) NOT NULL DEFAULT 0,
  `date_derniere_appro` timestamp NULL DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `magasin_stock`
--

INSERT INTO `magasin_stock` (`id_magasin_stock`, `id_produit`, `id_session`, `quantite_magasin`, `date_derniere_appro`, `date_creation`, `date_modification`) VALUES
(1, 1, 900277327, 80, '2025-12-14 18:39:05', '2025-12-14 18:38:08', '2025-12-14 18:39:05'),
(3, 2, 900277327, 20, '2025-12-14 19:05:09', '2025-12-14 19:05:09', '2025-12-14 19:05:09');

-- --------------------------------------------------------

--
-- Structure de la table `mouvements_stock`
--

CREATE TABLE `mouvements_stock` (
  `id_mouvement` int(15) NOT NULL,
  `id_produit` int(15) NOT NULL,
  `id_session` int(15) NOT NULL,
  `type_mouvement` varchar(20) NOT NULL COMMENT 'entree, sortie, transfert, ajustement, retour, perte',
  `quantite` int(15) NOT NULL,
  `depot_source` varchar(30) DEFAULT NULL,
  `depot_destination` varchar(30) DEFAULT NULL,
  `reference_mouvement` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `date_mouvement` date NOT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `variation_stock` int(15) NOT NULL COMMENT 'Quantité ajoutée (+) ou retirée (-)',
  `stock_avant` int(15) NOT NULL COMMENT 'Stock avant le mouvement',
  `stock_apres` int(15) NOT NULL COMMENT 'Stock après le mouvement'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `mouvements_stock`
--

INSERT INTO `mouvements_stock` (`id_mouvement`, `id_produit`, `id_session`, `type_mouvement`, `quantite`, `depot_source`, `depot_destination`, `reference_mouvement`, `notes`, `date_mouvement`, `date_creation`, `variation_stock`, `stock_avant`, `stock_apres`) VALUES
(1, 1, 900277327, 'sortie', 10, 'principal', '', 'bbbbbbbbbbbbbbbbbb', 'bjjjjjjjjjjjjjjjjjjjjjj', '2025-12-14', '2025-12-14 17:53:29', -10, 50, 40),
(2, 1, 900277327, 'sortie', 10, 'principal', '', 'zzzzzzzzzzzzzzzz', 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', '2025-12-12', '2025-12-14 17:54:49', -10, 40, 30),
(3, 1, 900277327, 'entree', 200, 'principal', '', 'ddddddddddddddddd', 'ccccccccccccccccccccccc', '2025-12-14', '2025-12-14 18:00:13', 200, 30, 230),
(4, 2, 900277327, 'sortie', 20, '', '', 'ssssssssssssssssssssssssé', 'éééééééééééééééééééééééééééééééééééé', '2025-12-14', '2025-12-14 20:04:24', -20, 80, 60);

-- --------------------------------------------------------

--
-- Structure de la table `points_vente_stock`
--

CREATE TABLE `points_vente_stock` (
  `id_point` int(11) NOT NULL,
  `id_produi_pvs` int(15) NOT NULL,
  `id_session_pvs` int(15) NOT NULL,
  `quantite_pvs` int(15) NOT NULL,
  `date_entre_pvs` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `produit`
--

CREATE TABLE `produit` (
  `id_produit` int(15) NOT NULL,
  `id_session` int(15) NOT NULL,
  `reference` varchar(30) NOT NULL,
  `nom_produit` varchar(40) NOT NULL,
  `prix_achat` int(15) NOT NULL,
  `prix_vente` int(15) NOT NULL,
  `quantite_stock` int(15) NOT NULL,
  `quantite_alerte` int(15) NOT NULL,
  `categorie` varchar(30) NOT NULL,
  `date_creation` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `produit`
--

INSERT INTO `produit` (`id_produit`, `id_session`, `reference`, `nom_produit`, `prix_achat`, `prix_vente`, `quantite_stock`, `quantite_alerte`, `categorie`, `date_creation`) VALUES
(1, 900277327, 'maltina009', 'MAltina', 2000, 2500, 130, 5, 'Boisson', '2025-12-14 17:5'),
(2, 900277327, 'coca_001', 'coda', 2000, 2500, 60, 5, 'Boisson', '2025-12-14 20:0');

-- --------------------------------------------------------

--
-- Structure de la table `users_jh`
--

CREATE TABLE `users_jh` (
  `users_name` varchar(30) NOT NULL,
  `password_users` varchar(12) NOT NULL,
  `role_users` varchar(4) NOT NULL,
  `id_magasin` int(5) NOT NULL,
  `id_users` int(11) NOT NULL,
  `numero_tele` int(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `users_jh`
--

INSERT INTO `users_jh` (`users_name`, `password_users`, `role_users`, `id_magasin`, `id_users`, `numero_tele`) VALUES
('jeremie', '002233jh', '1', 1, 1, 900277327);

-- --------------------------------------------------------

--
-- Structure de la table `ventes`
--

CREATE TABLE `ventes` (
  `id_vente` int(15) NOT NULL,
  `id_session` int(15) NOT NULL,
  `date_vente` datetime NOT NULL,
  `mode_paiement` varchar(20) NOT NULL DEFAULT 'cash',
  `devise` varchar(5) NOT NULL DEFAULT 'CDF',
  `sous_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `remise_pourcent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `montant_remise` decimal(15,2) NOT NULL DEFAULT 0.00,
  `montant_tva` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `montant_recu` decimal(15,2) NOT NULL DEFAULT 0.00,
  `monnaie` decimal(15,2) NOT NULL DEFAULT 0.00,
  `taux_usd` decimal(10,2) NOT NULL DEFAULT 2400.00,
  `statut` varchar(20) NOT NULL DEFAULT 'completee',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `vente_lignes`
--

CREATE TABLE `vente_lignes` (
  `id_ligne` int(15) NOT NULL,
  `id_vente` int(15) NOT NULL,
  `id_produit` int(15) NOT NULL,
  `quantite` int(11) NOT NULL,
  `prix_unitaire_cdf` decimal(15,2) NOT NULL,
  `prix_unitaire_usd` decimal(15,2) NOT NULL,
  `total_ligne` decimal(15,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `appro_magasin`
--
ALTER TABLE `appro_magasin`
  ADD PRIMARY KEY (`id_appro`);

--
-- Index pour la table `magasin`
--
ALTER TABLE `magasin`
  ADD PRIMARY KEY (`id_magasin`);

--
-- Index pour la table `magasin_stock`
--
ALTER TABLE `magasin_stock`
  ADD PRIMARY KEY (`id_magasin_stock`),
  ADD UNIQUE KEY `unique_produit_session` (`id_produit`,`id_session`);

--
-- Index pour la table `mouvements_stock`
--
ALTER TABLE `mouvements_stock`
  ADD PRIMARY KEY (`id_mouvement`);

--
-- Index pour la table `points_vente_stock`
--
ALTER TABLE `points_vente_stock`
  ADD PRIMARY KEY (`id_point`);

--
-- Index pour la table `produit`
--
ALTER TABLE `produit`
  ADD PRIMARY KEY (`id_produit`);

--
-- Index pour la table `users_jh`
--
ALTER TABLE `users_jh`
  ADD PRIMARY KEY (`id_users`);

--
-- Index pour la table `ventes`
--
ALTER TABLE `ventes`
  ADD PRIMARY KEY (`id_vente`),
  ADD KEY `idx_session` (`id_session`),
  ADD KEY `idx_date` (`date_vente`);

--
-- Index pour la table `vente_lignes`
--
ALTER TABLE `vente_lignes`
  ADD PRIMARY KEY (`id_ligne`),
  ADD KEY `idx_vente` (`id_vente`),
  ADD KEY `idx_produit` (`id_produit`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `appro_magasin`
--
ALTER TABLE `appro_magasin`
  MODIFY `id_appro` int(15) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `magasin`
--
ALTER TABLE `magasin`
  MODIFY `id_magasin` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `magasin_stock`
--
ALTER TABLE `magasin_stock`
  MODIFY `id_magasin_stock` int(15) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `mouvements_stock`
--
ALTER TABLE `mouvements_stock`
  MODIFY `id_mouvement` int(15) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `points_vente_stock`
--
ALTER TABLE `points_vente_stock`
  MODIFY `id_point` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `produit`
--
ALTER TABLE `produit`
  MODIFY `id_produit` int(15) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `users_jh`
--
ALTER TABLE `users_jh`
  MODIFY `id_users` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `ventes`
--
ALTER TABLE `ventes`
  MODIFY `id_vente` int(15) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `vente_lignes`
--
ALTER TABLE `vente_lignes`
  MODIFY `id_ligne` int(15) NOT NULL AUTO_INCREMENT;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `vente_lignes`
--
ALTER TABLE `vente_lignes`
  ADD CONSTRAINT `vente_lignes_ibfk_1` FOREIGN KEY (`id_vente`) REFERENCES `ventes` (`id_vente`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

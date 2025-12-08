-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : lun. 08 déc. 2025 à 06:14
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
-- Structure de la table `entree_stock`
--

CREATE TABLE `entree_stock` (
  `id_produit` int(15) NOT NULL,
  `id_session` int(15) NOT NULL,
  `depot` varchar(20) NOT NULL,
  `quantite` int(15) NOT NULL,
  `numero_reference` int(15) NOT NULL,
  `notes` varchar(40) NOT NULL,
  `date_entree` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
('lune', 'aaa/bbbbbbb/dddddd', 98377266, 1);

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
(1, 3333334, 'nn', 'nn', 100, 200, 100, 5, 'Alimentaire', '2025-12-07 02:3'),
(2, 3333334, 'nntr', 'nnbbv', 20, 700, 90, 5, 'Alimentaire', '2025-12-07 02:5'),
(3, 3333334, 'nntrè', 'gggg', 10, 20, 10, 5, 'Boisson', '2025-12-07 03:0'),
(4, 3333334, 'lune', 'astre', 1, 0, 0, 5, 'Hygiène', '2025-12-07 03:0'),
(5, 3333334, 'hhh', 'mangue', 200, 300, 200, 5, 'Alimentaire', '2025-12-07 03:1'),
(6, 3333334, 'soso', 'soso', 20, 400, 90, 5, 'Alimentaire', '2025-12-07 03:1'),
(7, 3333334, 'bbvbbv', 'vvbc', 2, 90, 30, 5, 'Boisson', '2025-12-07 03:2'),
(8, 3333334, 'bababa', 'baba', 10, 200, 30, 5, 'Alimentaire', '2025-12-07 20:1'),
(9, 3333334, 'jajaja', 'jajaja', 2500, 3000, 0, 5, 'Autre', '2025-12-07 20:2'),
(10, 3333334, 'Banane2', 'BANANE', 200, 4000, 0, 5, 'Alimentaire', '2025-12-07 20:3'),
(11, 3333334, 'vava', 'vava', 200, 400, 4, 5, 'Hygiène', '2025-12-07 20:4'),
(12, 3333334, 'haha', 'haha', 300, 3000, 20, 5, 'Alimentaire', '2025-12-07 22:3'),
(13, 3333334, 'XEXE', 'XEXE', 600, 1000, 30, 5, 'Boisson', '2025-12-07 22:3');

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
('enb', 'ezer0123', '1', 1, 1, 3333334),
('lali', '123456lali', '2', 1, 2, 9876542);

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `magasin`
--
ALTER TABLE `magasin`
  ADD PRIMARY KEY (`id_magasin`);

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
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `magasin`
--
ALTER TABLE `magasin`
  MODIFY `id_magasin` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `produit`
--
ALTER TABLE `produit`
  MODIFY `id_produit` int(15) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT pour la table `users_jh`
--
ALTER TABLE `users_jh`
  MODIFY `id_users` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

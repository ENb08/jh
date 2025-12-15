-- Table pour gérer le stock du Magasin 1
CREATE TABLE IF NOT EXISTS `magasin_stock` (
  `id_magasin_stock` int(15) NOT NULL AUTO_INCREMENT,
  `id_produit` int(15) NOT NULL,
  `id_session` int(15) NOT NULL,
  `quantite_magasin` int(15) NOT NULL DEFAULT 0,
  `date_derniere_appro` timestamp NULL DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_modification` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_magasin_stock`),
  UNIQUE KEY `unique_produit_session` (`id_produit`, `id_session`),
  KEY `idx_produit` (`id_produit`),
  KEY `idx_session` (`id_session`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table pour enregistrer les approvisionnements du magasin
CREATE TABLE IF NOT EXISTS `appro_magasin` (
  `id_appro` int(15) NOT NULL AUTO_INCREMENT,
  `id_produit` int(15) NOT NULL,
  `id_session` int(15) NOT NULL,
  `quantite` int(15) NOT NULL,
  `provenance` varchar(50) DEFAULT 'Stock Principal',
  `notes` text DEFAULT NULL,
  `date_appro` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_appro`),
  KEY `idx_produit` (`id_produit`),
  KEY `idx_session` (`id_session`),
  KEY `idx_date` (`date_appro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

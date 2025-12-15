-- Table des ventes
CREATE TABLE IF NOT EXISTS `ventes` (
  `id_vente` INT(15) NOT NULL AUTO_INCREMENT,
  `id_session` INT(15) NOT NULL,
  `date_vente` DATETIME NOT NULL,
  `mode_paiement` VARCHAR(20) NOT NULL DEFAULT 'cash',
  `devise` VARCHAR(5) NOT NULL DEFAULT 'CDF',
  `sous_total` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `remise_pourcent` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `montant_remise` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `montant_tva` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `total` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `montant_recu` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `monnaie` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `taux_usd` DECIMAL(10,2) NOT NULL DEFAULT 2400,
  `statut` VARCHAR(20) NOT NULL DEFAULT 'completee',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_vente`),
  KEY `idx_session` (`id_session`),
  KEY `idx_date` (`date_vente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table des lignes de vente
CREATE TABLE IF NOT EXISTS `vente_lignes` (
  `id_ligne` INT(15) NOT NULL AUTO_INCREMENT,
  `id_vente` INT(15) NOT NULL,
  `id_produit` INT(15) NOT NULL,
  `quantite` INT(11) NOT NULL,
  `prix_unitaire_cdf` DECIMAL(15,2) NOT NULL,
  `prix_unitaire_usd` DECIMAL(15,2) NOT NULL,
  `total_ligne` DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (`id_ligne`),
  KEY `idx_vente` (`id_vente`),
  KEY `idx_produit` (`id_produit`),
  FOREIGN KEY (`id_vente`) REFERENCES `ventes`(`id_vente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

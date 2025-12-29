-- =====================================================
-- Tables pour la Trésorerie - SuperMarket Pro
-- À exécuter dans phpMyAdmin pour ajouter les tables manquantes
-- =====================================================

-- Table des mouvements de trésorerie (dépenses, entrées, sorties)
CREATE TABLE IF NOT EXISTS `mouvements_tresorerie` (
  `id_mouvement` INT(15) NOT NULL AUTO_INCREMENT,
  `id_magasin` INT(15) NOT NULL DEFAULT 1,
  `user_id` INT(15) NOT NULL,
  `type_mouvement` VARCHAR(30) NOT NULL COMMENT 'entree, sortie, depense, ajustement',
  `montant` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `devise` VARCHAR(5) NOT NULL DEFAULT 'CDF',
  `description` TEXT DEFAULT NULL,
  `categorie` VARCHAR(50) DEFAULT 'autre' COMMENT 'salaire, loyer, transport, fourniture, autre',
  `reference` VARCHAR(50) DEFAULT NULL,
  `date_mouvement` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_mouvement`),
  KEY `idx_magasin` (`id_magasin`),
  KEY `idx_user` (`user_id`),
  KEY `idx_type` (`type_mouvement`),
  KEY `idx_date` (`date_mouvement`),
  KEY `idx_categorie` (`categorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table des entrées de stock (achats fournisseurs)
CREATE TABLE IF NOT EXISTS `stock_entrees` (
  `id_entree` INT(15) NOT NULL AUTO_INCREMENT,
  `id_magasin` INT(15) NOT NULL DEFAULT 1,
  `id_session` INT(15) NOT NULL,
  `fournisseur` VARCHAR(100) DEFAULT NULL,
  `numero_facture` VARCHAR(50) DEFAULT NULL,
  `montant_total` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `devise` VARCHAR(5) NOT NULL DEFAULT 'CDF',
  `description` TEXT DEFAULT NULL,
  `statut` VARCHAR(20) DEFAULT 'payee' COMMENT 'payee, en_attente, partiellement_payee',
  `date_echeance` DATE DEFAULT NULL,
  `date_entree` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_entree`),
  KEY `idx_magasin` (`id_magasin`),
  KEY `idx_session` (`id_session`),
  KEY `idx_fournisseur` (`fournisseur`),
  KEY `idx_date` (`date_entree`),
  KEY `idx_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table des détails des entrées de stock
CREATE TABLE IF NOT EXISTS `stock_entrees_details` (
  `id_detail` INT(15) NOT NULL AUTO_INCREMENT,
  `id_entree` INT(15) NOT NULL,
  `id_produit` INT(15) NOT NULL,
  `quantite` INT(15) NOT NULL DEFAULT 0,
  `prix_unitaire` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `prix_total` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `devise` VARCHAR(5) NOT NULL DEFAULT 'CDF',
  PRIMARY KEY (`id_detail`),
  KEY `idx_entree` (`id_entree`),
  KEY `idx_produit` (`id_produit`),
  CONSTRAINT `fk_stock_entrees_details` FOREIGN KEY (`id_entree`) REFERENCES `stock_entrees` (`id_entree`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table du taux de change
CREATE TABLE IF NOT EXISTS `taux_change` (
  `id_taux` INT(11) NOT NULL AUTO_INCREMENT,
  `id_magasin` INT(15) NOT NULL DEFAULT 1,
  `taux_usd` DECIMAL(10,2) NOT NULL DEFAULT 2800.00 COMMENT 'Taux USD vers CDF',
  `date_modification` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modifie_par` INT(15) DEFAULT NULL,
  PRIMARY KEY (`id_taux`),
  KEY `idx_magasin` (`id_magasin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insérer un taux de change par défaut
INSERT INTO `taux_change` (`id_magasin`, `taux_usd`, `date_modification`) 
VALUES (1, 2800.00, NOW())
ON DUPLICATE KEY UPDATE `taux_usd` = 2800.00;

-- =====================================================
-- Données de test (optionnel - à commenter en production)
-- =====================================================

-- Quelques dépenses de test
INSERT INTO `mouvements_tresorerie` (`id_magasin`, `user_id`, `type_mouvement`, `montant`, `devise`, `description`, `categorie`, `date_mouvement`) VALUES
(1, 1, 'depense', 50000.00, 'CDF', 'Achat fournitures bureau', 'fourniture', NOW()),
(1, 1, 'depense', 100000.00, 'CDF', 'Paiement électricité', 'facture', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, 1, 'depense', 25.00, 'USD', 'Transport marchandises', 'transport', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, 1, 'sortie', 200000.00, 'CDF', 'Paiement salaire employé', 'salaire', DATE_SUB(NOW(), INTERVAL 7 DAY));

-- Quelques entrées de stock de test
INSERT INTO `stock_entrees` (`id_magasin`, `id_session`, `fournisseur`, `numero_facture`, `montant_total`, `devise`, `description`, `statut`, `date_entree`) VALUES
(1, 900277327, 'Fournisseur ABC', 'FAC-2025-001', 500000.00, 'CDF', 'Achat boissons', 'payee', NOW()),
(1, 900277327, 'Grossiste XYZ', 'FAC-2025-002', 150.00, 'USD', 'Achat produits alimentaires', 'en_attente', DATE_SUB(NOW(), INTERVAL 2 DAY));


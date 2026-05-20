-- Schéma MySQL — toxic-beats / toxic-files.com
-- À exécuter sur le VPS :  mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS toxic_beats CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'toxic'@'localhost' IDENTIFIED BY '%%MYSQL_PASSWORD%%';
GRANT ALL PRIVILEGES ON toxic_beats.* TO 'toxic'@'localhost';
FLUSH PRIVILEGES;

USE toxic_beats;

-- ── Utilisateurs (remplace Supabase Auth) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           VARCHAR(36)                      PRIMARY KEY,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('admin','customer')         NOT NULL DEFAULT 'customer',
  created_at   TIMESTAMP                        DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP                        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Beats ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beats (
  id              VARCHAR(36)                            PRIMARY KEY,
  title           VARCHAR(255)                           NOT NULL,
  genre           VARCHAR(100)                           NOT NULL DEFAULT 'Non classé',
  bpm             INT,
  price           DECIMAL(10,2)                          NOT NULL DEFAULT 0,
  preview_url     TEXT,
  full_file_path  TEXT,
  description     TEXT,
  tags            JSON,
  image_url       TEXT,
  status          ENUM('available','reserved','sold')    DEFAULT 'available',
  visible         TINYINT(1)                             DEFAULT 1,
  wav_extra       DECIMAL(10,2),
  exclusive_price DECIMAL(10,2),
  wav_file_path   TEXT,
  stems_zip_path  TEXT,
  `key`           VARCHAR(50),
  duration        INT,
  created_at      TIMESTAMP                              DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP                              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Kits ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kits (
  id           VARCHAR(36)                        PRIMARY KEY,
  title        VARCHAR(255)                       NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2)                      NOT NULL DEFAULT 0,
  preview_url  TEXT,
  preview_path TEXT,
  zip_path     TEXT,
  image_url    TEXT,
  status       ENUM('available','hidden')         DEFAULT 'available',
  created_at   TIMESTAMP                          DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP                          DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Commandes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  VARCHAR(36)                              PRIMARY KEY,
  beat_id             VARCHAR(36),
  kit_id              VARCHAR(36),
  beat_title          VARCHAR(255)                             NOT NULL,
  buyer_name          VARCHAR(255)                             NOT NULL,
  buyer_email         VARCHAR(255)                             NOT NULL,
  amount              DECIMAL(10,2)                            NOT NULL,
  status              ENUM('pending','paid','cancelled','deleted') DEFAULT 'pending',
  license_type        ENUM('mp3','wav','exclusive')            DEFAULT 'mp3',
  product_type        ENUM('beat','kit')                       DEFAULT 'beat',
  download_token      VARCHAR(255),
  token_expires_at    DATETIME,
  token_used          TINYINT(1)                               DEFAULT 0,
  notes               TEXT,
  preview_url         TEXT,
  files_sent_at       DATETIME,
  files_sent_history  JSON,
  downloaded_at       JSON,
  archived_at         DATETIME,
  promo_code          VARCHAR(50),
  discount_amount     DECIMAL(10,2)                            DEFAULT 0,
  created_at          TIMESTAMP                                DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP                                DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_download_token (download_token),
  INDEX idx_buyer_email    (buyer_email),
  INDEX idx_beat_id        (beat_id),
  INDEX idx_kit_id         (kit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Paramètres clé/valeur ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  `key`      VARCHAR(255)  PRIMARY KEY,
  value      LONGTEXT,
  updated_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Codes promo ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id          VARCHAR(36)               PRIMARY KEY,
  code        VARCHAR(50)               NOT NULL UNIQUE,
  type        ENUM('percent','fixed')   NOT NULL,
  value       DECIMAL(10,2),
  description TEXT,
  max_uses    INT,
  uses_count  INT                       DEFAULT 0,
  expires_at  DATETIME,
  is_active   TINYINT(1)               DEFAULT 1,
  created_at  TIMESTAMP                DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP                DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Newsletter abonnés ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id               VARCHAR(36)                                      PRIMARY KEY,
  email            VARCHAR(255)                                     NOT NULL UNIQUE,
  status           ENUM('pending','confirmed','unsubscribed')       DEFAULT 'pending',
  confirm_token    VARCHAR(255),
  unsubscribe_token VARCHAR(255),
  subscribed_at    TIMESTAMP                                        DEFAULT CURRENT_TIMESTAMP,
  confirmed_at     DATETIME,
  unsubscribed_at  DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Newsletter campagnes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id              VARCHAR(36)  PRIMARY KEY,
  subject         VARCHAR(255),
  body_html       LONGTEXT,
  recipient_count INT          DEFAULT 0,
  sent_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Articles de blog ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id           VARCHAR(36)    PRIMARY KEY,
  title        VARCHAR(255)   NOT NULL,
  slug         VARCHAR(255)   NOT NULL UNIQUE,
  content_html LONGTEXT,
  excerpt      TEXT,
  cover_url    TEXT,
  published_at DATETIME,
  visible      TINYINT(1)     DEFAULT 1,
  created_at   TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Demandes de beats sur mesure ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beat_requests (
  id           VARCHAR(36)                                       PRIMARY KEY,
  name         VARCHAR(255)                                      NOT NULL,
  email        VARCHAR(255)                                      NOT NULL,
  project_type VARCHAR(100),
  style        VARCHAR(100),
  budget       VARCHAR(100),
  deadline     VARCHAR(100),
  inspirations TEXT,
  description  TEXT,
  status       ENUM('new','read','in_progress','replied','closed') DEFAULT 'new',
  reply_text   TEXT,
  replied_at   DATETIME,
  created_at   TIMESTAMP                                         DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE DATABASE IF NOT EXISTS dengue_practice;
USE dengue_practice;

CREATE TABLE IF NOT EXISTS patient_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    district VARCHAR(100) NOT NULL,
    area_type VARCHAR(50) NOT NULL,
    age INT NOT NULL,
    fever_days INT NOT NULL,
    temperature_c FLOAT NOT NULL,
    platelet_count INT NOT NULL,
    wbc_count INT NOT NULL,
    rainfall_mm FLOAT NOT NULL,
    lat DOUBLE NOT NULL,
    lng DOUBLE NOT NULL,
    high_risk TINYINT(1) NOT NULL
);

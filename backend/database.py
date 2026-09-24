import os
import sqlite3


# =========================================================
# DATABASE CONFIGURATION
# =========================================================

# Project root:
# D:\Projects\Handson Project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Use the main CampusCare database
DATABASE_NAME = os.path.join(BASE_DIR, "campuscare.db")


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db_connection():

    connection = sqlite3.connect(DATABASE_NAME)

    connection.row_factory = sqlite3.Row

    return connection


# =========================================================
# CREATE TABLES
# =========================================================

def create_tables():

    connection = get_db_connection()

    # -----------------------------------------------------
    # USERS TABLE
    # -----------------------------------------------------

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            email TEXT NOT NULL UNIQUE,

            password TEXT NOT NULL,

            role TEXT NOT NULL DEFAULT 'student',

            profile_image TEXT

        )
        """
    )

    # Check whether profile_image already exists
    user_columns = connection.execute(
        "PRAGMA table_info(users)"
    ).fetchall()

    if not any(column[1] == "profile_image" for column in user_columns):

        connection.execute(
            "ALTER TABLE users ADD COLUMN profile_image TEXT"
        )

    # -----------------------------------------------------
    # ISSUES TABLE
    # -----------------------------------------------------

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS issues (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            title TEXT NOT NULL,

            description TEXT NOT NULL,

            category TEXT NOT NULL,

            location TEXT NOT NULL,

            priority TEXT NOT NULL DEFAULT 'Medium',

            status TEXT NOT NULL DEFAULT 'Reported',

            reported_by INTEGER NOT NULL,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            image_filename TEXT,

            FOREIGN KEY (reported_by)
            REFERENCES users(id)

        )
        """
    )

    # -----------------------------------------------------
    # ISSUE IMAGES TABLE
    # -----------------------------------------------------

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS issue_images (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            issue_id INTEGER NOT NULL,

            image_filename TEXT NOT NULL,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (issue_id)
            REFERENCES issues(id)
            ON DELETE CASCADE

        )
        """
    )

    connection.commit()

    connection.close()
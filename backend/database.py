import os

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError
from gridfs import GridFSBucket


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()


# =========================================================
# MONGODB CONFIGURATION
# =========================================================

MONGO_URI = os.getenv("MONGO_URI")

MONGO_DB_NAME = os.getenv(
    "MONGO_DB_NAME",
    "campuscare"
)


if not MONGO_URI:
    raise RuntimeError(
        "MONGO_URI environment variable is not set."
    )


# =========================================================
# MONGODB CLIENT
# =========================================================

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=10000
)

db = client[MONGO_DB_NAME]


# =========================================================
# COLLECTIONS
# =========================================================

users_collection = db["users"]

issues_collection = db["issues"]

issue_images_collection = db["issue_images"]

counters_collection = db["counters"]


# =========================================================
# GRIDFS
# =========================================================

gridfs_bucket = GridFSBucket(db)


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

def create_tables():

    """
    MongoDB does not require CREATE TABLE statements.

    This function creates useful indexes and checks
    the MongoDB connection.
    """

    try:

        # Test MongoDB connection
        client.admin.command("ping")

        # -------------------------------------------------
        # USERS INDEXES
        # -------------------------------------------------

        users_collection.create_index(
            [("email", ASCENDING)],
            unique=True
        )

        users_collection.create_index(
            [("id", DESCENDING)]
        )

        # -------------------------------------------------
        # ISSUES INDEXES
        # -------------------------------------------------

        issues_collection.create_index(
            [("id", DESCENDING)]
        )

        issues_collection.create_index(
            [("reported_by", ASCENDING)]
        )

        # -------------------------------------------------
        # ISSUE IMAGES INDEXES
        # -------------------------------------------------

        issue_images_collection.create_index(
            [("issue_id", ASCENDING)]
        )

        issue_images_collection.create_index(
            [("id", ASCENDING)]
        )

        print("MongoDB connection successful!")
        print(f"Database: {MONGO_DB_NAME}")

    except Exception as error:

        print("MongoDB connection failed!")
        print(error)

        raise


# =========================================================
# GET DATABASE
# =========================================================

def get_db_connection():

    """
    Compatibility function.

    Returns the MongoDB database object.
    """

    return db


# =========================================================
# GENERATE INTEGER ID
# =========================================================

def get_next_id(collection_name):

    """
    Generates sequential integer IDs using a MongoDB
    counters collection.

    Example:

    users:
    1
    2
    3

    issues:
    1
    2
    3
    """

    counter = counters_collection.find_one_and_update(
        {
            "_id": collection_name
        },
        {
            "$inc": {
                "seq": 1
            }
        },
        upsert=True,
        return_document=True
    )

    return counter["seq"]


# =========================================================
# INITIALIZE COUNTERS
# =========================================================

def initialize_counter(collection_name, collection):

    """
    If a collection already contains documents but the
    counter does not exist, initialize the counter from
    the highest existing ID.
    """

    existing_counter = counters_collection.find_one(
        {
            "_id": collection_name
        }
    )

    if existing_counter:
        return

    last_document = collection.find_one(
        {},
        sort=[
            ("id", DESCENDING)
        ]
    )

    if last_document:

        highest_id = last_document.get(
            "id",
            0
        )

    else:

        highest_id = 0

    counters_collection.insert_one(
        {
            "_id": collection_name,
            "seq": highest_id
        }
    )


# =========================================================
# INITIALIZE ALL COUNTERS
# =========================================================

def initialize_counters():

    initialize_counter(
        "users",
        users_collection
    )

    initialize_counter(
        "issues",
        issues_collection
    )

    initialize_counter(
        "issue_images",
        issue_images_collection
    )


# =========================================================
# START DATABASE
# =========================================================

create_tables()

initialize_counters()
from flask import (
    Flask,
    jsonify,
    request,
    send_file
)

from flask_cors import CORS

from werkzeug.utils import secure_filename

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from database import (
    create_tables,
    users_collection,
    issues_collection,
    issue_images_collection,
    gridfs_bucket,
    get_next_id
)

from pymongo.errors import DuplicateKeyError

from bson import ObjectId

from io import BytesIO

import os

from datetime import datetime


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)

CORS(app)


# =========================================================
# UPLOAD CONFIGURATION
# =========================================================

ALLOWED_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp"
}


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

create_tables()


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def allowed_file(filename):

    return (
        "." in filename
        and filename.rsplit(
            ".",
            1
        )[1].lower()
        in ALLOWED_EXTENSIONS
    )


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():

    return jsonify({
        "success": True,
        "message": "Welcome to CampusCare!"
    })


# =========================================================
# TEST API
# =========================================================

@app.route("/api/test")
def test_api():

    return jsonify({
        "success": True,
        "message": "CampusCare backend is working!"
    })


# =========================================================
# REGISTER
# =========================================================

@app.route(
    "/api/register",
    methods=["POST"]
)
def register():

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "message": "Invalid request data."
        }), 400

    name = data.get(
        "name",
        ""
    ).strip()

    email = data.get(
        "email",
        ""
    ).strip().lower()

    password = data.get(
        "password",
        ""
    )

    if not name or not email or not password:

        return jsonify({
            "success": False,
            "message": "Name, email and password are required."
        }), 400

    # -----------------------------------------------------
    # HASH PASSWORD
    # -----------------------------------------------------

    hashed_password = generate_password_hash(
        password
    )

    # -----------------------------------------------------
    # CREATE USER
    # -----------------------------------------------------

    user_id = get_next_id(
        "users"
    )

    user_document = {

        "id": user_id,

        "name": name,

        "email": email,

        "password": hashed_password,

        "role": "student",

        "profile_image": None
    }

    try:

        users_collection.insert_one(
            user_document
        )

        return jsonify({
            "success": True,
            "message": "Account created successfully!"
        }), 201

    except DuplicateKeyError:

        return jsonify({
            "success": False,
            "message": "Email already exists."
        }), 409

    except Exception as error:

        print("REGISTER ERROR:", error)

        return jsonify({
            "success": False,
            "message": "Failed to create account."
        }), 500


# =========================================================
# LOGIN
# =========================================================

@app.route(
    "/api/login",
    methods=["POST"]
)
def login():

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "message": "Invalid request data."
        }), 400

    email = data.get(
        "email",
        ""
    ).strip().lower()

    password = data.get(
        "password",
        ""
    )

    if not email or not password:

        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400

    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    user = users_collection.find_one(
        {
            "email": email
        }
    )

    if not user:

        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    stored_password = user.get(
        "password",
        ""
    )

    password_valid = False

    # -----------------------------------------------------
    # HASHED PASSWORD
    # -----------------------------------------------------

    try:

        if (
            stored_password.startswith("scrypt:")
            or stored_password.startswith("pbkdf2:")
            or stored_password.startswith("argon2:")
        ):

            password_valid = check_password_hash(
                stored_password,
                password
            )

        else:

            # Old plain-text compatibility
            password_valid = (
                stored_password == password
            )

    except Exception:

        password_valid = False

    if not password_valid:

        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    # -----------------------------------------------------
    # LOGIN SUCCESS
    # -----------------------------------------------------

    return jsonify({

        "success": True,

        "message": "Login successful!",

        "user": {

            "id": user.get("id"),

            "name": user.get("name"),

            "email": user.get("email"),

            "role": user.get(
                "role",
                "student"
            ),

            "profile_image": user.get(
                "profile_image"
            )
        }

    }), 200


# =========================================================
# GET USER PROFILE
# =========================================================

@app.route(
    "/api/users/<int:user_id>",
    methods=["GET"]
)
def get_user(user_id):

    user = users_collection.find_one(
        {
            "id": user_id
        }
    )

    if not user:

        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    return jsonify({

        "success": True,

        "user": {

            "id": user.get("id"),

            "name": user.get("name"),

            "email": user.get("email"),

            "role": user.get("role"),

            "profile_image": user.get(
                "profile_image"
            )
        }
    })


# =========================================================
# UPDATE USER PROFILE
# =========================================================

@app.route(
    "/api/users/<int:user_id>",
    methods=["PUT"]
)
def update_user(user_id):

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "message": "Invalid request data."
        }), 400

    name = data.get(
        "name"
    )

    email = data.get(
        "email"
    )

    if not name or not email:

        return jsonify({
            "success": False,
            "message": "Name and email are required."
        }), 400

    name = name.strip()

    email = email.strip().lower()

    # -----------------------------------------------------
    # CHECK EMAIL USED BY ANOTHER USER
    # -----------------------------------------------------

    existing_user = users_collection.find_one({

        "email": email,

        "id": {
            "$ne": user_id
        }
    })

    if existing_user:

        return jsonify({
            "success": False,
            "message": "Email may already be in use."
        }), 409

    result = users_collection.update_one(

        {
            "id": user_id
        },

        {
            "$set": {

                "name": name,

                "email": email
            }
        }
    )

    if result.matched_count == 0:

        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    return jsonify({

        "success": True,

        "message": "Profile updated successfully."
    })


# =========================================================
# GET ALL USERS
# =========================================================

@app.route(
    "/api/users",
    methods=["GET"]
)
def get_users():

    users = users_collection.find(
        {},
        {
            "_id": 0,

            "id": 1,

            "name": 1,

            "email": 1,

            "role": 1,

            "profile_image": 1
        }
    ).sort(
        "id",
        -1
    )

    result = list(users)

    return jsonify(result)


# =========================================================
# PROFILE IMAGE - UPLOAD
# =========================================================

@app.route(
    "/api/users/<int:user_id>/profile-image",
    methods=["POST"]
)
def upload_profile_image(user_id):

    user = users_collection.find_one(
        {
            "id": user_id
        }
    )

    if not user:

        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    if "image" not in request.files:

        return jsonify({
            "success": False,
            "message": "No image provided."
        }), 400

    image = request.files["image"]

    if not image or not image.filename:

        return jsonify({
            "success": False,
            "message": "No image selected."
        }), 400

    if not allowed_file(
        image.filename
    ):

        return jsonify({
            "success": False,
            "message": "Invalid image format."
        }), 400

    # -----------------------------------------------------
    # DELETE OLD PROFILE IMAGE
    # -----------------------------------------------------

    old_filename = user.get(
        "profile_image"
    )

    if old_filename:

        try:

            old_files = gridfs_bucket.find(
                {
                    "filename": old_filename
                }
            )

            for old_file in old_files:

                try:

                    gridfs_bucket.delete(
                        old_file._id
                    )

                except Exception:

                    pass

        except Exception:

            pass

    # -----------------------------------------------------
    # CREATE UNIQUE FILE NAME
    # -----------------------------------------------------

    original_filename = secure_filename(
        image.filename
    )

    timestamp = datetime.now().strftime(
        "%Y%m%d%H%M%S%f"
    )

    filename = (
        timestamp
        + "_profile_"
        + original_filename
    )

    # -----------------------------------------------------
    # SAVE TO GRIDFS
    # -----------------------------------------------------

    file_id = gridfs_bucket.upload_from_stream(
        filename,
        image,
        metadata={
            "user_id": user_id,
            "type": "profile_image"
        }
    )

    # -----------------------------------------------------
    # UPDATE USER
    # -----------------------------------------------------

    users_collection.update_one(

        {
            "id": user_id
        },

        {
            "$set": {
                "profile_image": filename
            }
        }
    )

    return jsonify({

        "success": True,

        "message": "Profile image uploaded successfully.",

        "profile_image": filename
    })


# =========================================================
# PROFILE IMAGE - DELETE
# =========================================================

@app.route(
    "/api/users/<int:user_id>/profile-image",
    methods=["DELETE"]
)
def delete_profile_image(user_id):

    user = users_collection.find_one(
        {
            "id": user_id
        }
    )

    if not user:

        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    filename = user.get(
        "profile_image"
    )

    if filename:

        try:

            files = gridfs_bucket.find(
                {
                    "filename": filename
                }
            )

            for file in files:

                try:

                    gridfs_bucket.delete(
                        file._id
                    )

                except Exception:

                    pass

        except Exception:

            pass

    users_collection.update_one(

        {
            "id": user_id
        },

        {
            "$set": {
                "profile_image": None
            }
        }
    )

    return jsonify({

        "success": True,

        "message": "Profile image removed successfully."
    })


# =========================================================
# CREATE ISSUE
# =========================================================

@app.route(
    "/api/issues",
    methods=["POST"]
)
def create_issue():

    title = request.form.get(
        "title",
        ""
    ).strip()

    description = request.form.get(
        "description",
        ""
    ).strip()

    category = request.form.get(
        "category",
        ""
    ).strip()

    location = request.form.get(
        "location",
        ""
    ).strip()

    priority = request.form.get(
        "priority",
        "Medium"
    ).strip()

    reported_by = request.form.get(
        "reported_by"
    )

    if (
        not title
        or not description
        or not category
        or not location
        or not reported_by
    ):

        return jsonify({
            "success": False,
            "message": "Please fill all required fields."
        }), 400

    # -----------------------------------------------------
    # CHECK USER
    # -----------------------------------------------------

    try:

        reported_by = int(
            reported_by
        )

    except ValueError:

        return jsonify({
            "success": False,
            "message": "Invalid user ID."
        }), 400

    user = users_collection.find_one(
        {
            "id": reported_by
        }
    )

    if not user:

        return jsonify({
            "success": False,
            "message": "Reporting user not found."
        }), 404

    # -----------------------------------------------------
    # VALIDATE PRIORITY
    # -----------------------------------------------------

    allowed_priorities = [
        "Low",
        "Medium",
        "High"
    ]

    if priority not in allowed_priorities:

        priority = "Medium"

    image_filename = None

    # -----------------------------------------------------
    # CREATE ISSUE ID
    # -----------------------------------------------------

    issue_id = get_next_id(
        "issues"
    )

    # -----------------------------------------------------
    # OPTIONAL IMAGE
    # -----------------------------------------------------

    if "image" in request.files:

        image = request.files["image"]

        if image and image.filename:

            if not allowed_file(
                image.filename
            ):

                return jsonify({
                    "success": False,
                    "message": "Invalid image format."
                }), 400

            original_filename = secure_filename(
                image.filename
            )

            timestamp = datetime.now().strftime(
                "%Y%m%d%H%M%S%f"
            )

            image_filename = (
                timestamp
                + "_issue_"
                + original_filename
            )

            # -------------------------------------------------
            # SAVE IMAGE TO GRIDFS
            # -------------------------------------------------

            gridfs_bucket.upload_from_stream(

                image_filename,

                image,

                metadata={

                    "issue_id": issue_id,

                    "reported_by": reported_by,

                    "type": "issue_image"
                }
            )

    # -----------------------------------------------------
    # CREATE ISSUE DOCUMENT
    # -----------------------------------------------------

    issue_document = {

        "id": issue_id,

        "title": title,

        "description": description,

        "category": category,

        "location": location,

        "priority": priority,

        "status": "Reported",

        "reported_by": reported_by,

        "created_at": datetime.now().isoformat(
            timespec="seconds"
        ),

        "image_filename": image_filename
    }

    try:

        issues_collection.insert_one(
            issue_document
        )

        # -------------------------------------------------
        # SAVE IMAGE RECORD
        # -------------------------------------------------

        if image_filename:

            image_id = get_next_id(
                "issue_images"
            )

            issue_images_collection.insert_one({

                "id": image_id,

                "issue_id": issue_id,

                "image_filename": image_filename,

                "created_at": datetime.now().isoformat(
                    timespec="seconds"
                )
            })

        return jsonify({

            "success": True,

            "message": "Issue reported successfully!",

            "issue_id": issue_id

        }), 201

    except Exception as error:

        print(
            "CREATE ISSUE ERROR:",
            error
        )

        return jsonify({

            "success": False,

            "message": "Failed to create issue.",

            "error": str(error)

        }), 500


# =========================================================
# GET MY ISSUES
# =========================================================

@app.route(
    "/api/issues/<int:user_id>",
    methods=["GET"]
)
def get_my_issues(user_id):

    issues = issues_collection.find({

        "reported_by": user_id

    }).sort(
        "id",
        -1
    )

    result = []

    for issue in issues:

        issue_data = {

            "id": issue.get("id"),

            "title": issue.get("title"),

            "description": issue.get(
                "description"
            ),

            "category": issue.get(
                "category"
            ),

            "location": issue.get(
                "location"
            ),

            "priority": issue.get(
                "priority"
            ),

            "status": issue.get(
                "status"
            ),

            "reported_by": issue.get(
                "reported_by"
            ),

            "created_at": issue.get(
                "created_at"
            ),

            "image_filename": issue.get(
                "image_filename"
            )
        }

        # -------------------------------------------------
        # MAIN IMAGE URL
        # -------------------------------------------------

        if issue_data.get(
            "image_filename"
        ):

            issue_data["image_url"] = (
                request.host_url.rstrip("/")
                + "/uploads/"
                + issue_data["image_filename"]
            )

        else:

            issue_data["image_url"] = None

        # -------------------------------------------------
        # GET MULTIPLE IMAGES
        # -------------------------------------------------

        images = issue_images_collection.find({

            "issue_id": issue.get("id")

        }).sort(
            "id",
            1
        )

        issue_data["images"] = [

            {

                "filename": image.get(
                    "image_filename"
                ),

                "url":
                    request.host_url.rstrip("/")
                    + "/uploads/"
                    + image.get(
                        "image_filename"
                    )
            }

            for image in images
        ]

        result.append(
            issue_data
        )

    return jsonify(result)


# =========================================================
# GET ALL ISSUES
# =========================================================

@app.route(
    "/api/issues",
    methods=["GET"]
)
def get_all_issues():

    issues = issues_collection.find().sort(
        "id",
        -1
    )

    result = []

    for issue in issues:

        reported_by = issue.get(
            "reported_by"
        )

        user = users_collection.find_one({

            "id": reported_by

        })

        issue_data = {

            "id": issue.get("id"),

            "title": issue.get("title"),

            "description": issue.get(
                "description"
            ),

            "category": issue.get(
                "category"
            ),

            "location": issue.get(
                "location"
            ),

            "priority": issue.get(
                "priority"
            ),

            "status": issue.get(
                "status"
            ),

            "reported_by": reported_by,

            "created_at": issue.get(
                "created_at"
            ),

            "image_filename": issue.get(
                "image_filename"
            ),

            "user_name":
                user.get("name")
                if user
                else None,

            "user_email":
                user.get("email")
                if user
                else None
        }

        # -------------------------------------------------
        # MAIN IMAGE URL
        # -------------------------------------------------

        if issue_data.get(
            "image_filename"
        ):

            issue_data["image_url"] = (
                request.host_url.rstrip("/")
                + "/uploads/"
                + issue_data["image_filename"]
            )

        else:

            issue_data["image_url"] = None

        # -------------------------------------------------
        # MULTIPLE IMAGES
        # -------------------------------------------------

        images = issue_images_collection.find({

            "issue_id": issue.get("id")

        }).sort(
            "id",
            1
        )

        issue_data["images"] = [

            {

                "filename": image.get(
                    "image_filename"
                ),

                "url":
                    request.host_url.rstrip("/")
                    + "/uploads/"
                    + image.get(
                        "image_filename"
                    )
            }

            for image in images
        ]

        result.append(
            issue_data
        )

    return jsonify(result)


# =========================================================
# UPDATE ISSUE STATUS
# =========================================================

@app.route(
    "/api/issues/<int:issue_id>/status",
    methods=["PUT"]
)
def update_issue_status(issue_id):

    data = request.get_json()

    status = (
        data.get("status")
        if data
        else None
    )

    allowed_statuses = [

        "Reported",

        "In Progress",

        "Resolved"
    ]

    if status not in allowed_statuses:

        return jsonify({

            "success": False,

            "message": "Invalid status."

        }), 400

    result = issues_collection.update_one(

        {
            "id": issue_id
        },

        {
            "$set": {
                "status": status
            }
        }
    )

    if result.matched_count == 0:

        return jsonify({

            "success": False,

            "message": "Issue not found."

        }), 404

    return jsonify({

        "success": True,

        "message":
            "Issue status updated successfully."
    })


# =========================================================
# ADMIN STATUS ROUTE
# =========================================================

@app.route(
    "/api/admin/issues/<int:issue_id>/status",
    methods=["PUT"]
)
def admin_update_issue_status(issue_id):

    return update_issue_status(
        issue_id
    )


# =========================================================
# UPDATE ISSUE PRIORITY
# =========================================================

@app.route(
    "/api/issues/<int:issue_id>/priority",
    methods=["PUT"]
)
def update_issue_priority(issue_id):

    data = request.get_json()

    priority = (
        data.get("priority")
        if data
        else None
    )

    allowed_priorities = [

        "Low",

        "Medium",

        "High"
    ]

    if priority not in allowed_priorities:

        return jsonify({

            "success": False,

            "message": "Invalid priority."

        }), 400

    result = issues_collection.update_one(

        {
            "id": issue_id
        },

        {
            "$set": {
                "priority": priority
            }
        }
    )

    if result.matched_count == 0:

        return jsonify({

            "success": False,

            "message": "Issue not found."

        }), 404

    return jsonify({

        "success": True,

        "message":
            "Issue priority updated successfully."
    })


# =========================================================
# ADMIN PRIORITY ROUTE
# =========================================================

@app.route(
    "/api/admin/issues/<int:issue_id>/priority",
    methods=["PUT"]
)
def admin_update_issue_priority(issue_id):

    return update_issue_priority(
        issue_id
    )


# =========================================================
# DELETE ISSUE
# =========================================================

@app.route(
    "/api/issues/<int:issue_id>",
    methods=["DELETE"]
)
def delete_issue(issue_id):

    # -----------------------------------------------------
    # FIND ISSUE
    # -----------------------------------------------------

    issue = issues_collection.find_one({

        "id": issue_id
    })

    if not issue:

        return jsonify({

            "success": False,

            "message": "Issue not found."

        }), 404

    filenames = []

    # -----------------------------------------------------
    # MAIN IMAGE
    # -----------------------------------------------------

    main_image = issue.get(
        "image_filename"
    )

    if main_image:

        filenames.append(
            main_image
        )

    # -----------------------------------------------------
    # FIND ALL IMAGE RECORDS
    # -----------------------------------------------------

    images = list(
        issue_images_collection.find({

            "issue_id": issue_id
        })
    )

    for image in images:

        filename = image.get(
            "image_filename"
        )

        if (
            filename
            and filename not in filenames
        ):

            filenames.append(
                filename
            )

    # -----------------------------------------------------
    # DELETE IMAGE RECORDS
    # -----------------------------------------------------

    issue_images_collection.delete_many({

        "issue_id": issue_id
    })

    # -----------------------------------------------------
    # DELETE ISSUE
    # -----------------------------------------------------

    issues_collection.delete_one({

        "id": issue_id
    })

    # -----------------------------------------------------
    # DELETE FILES FROM GRIDFS
    # -----------------------------------------------------

    for filename in filenames:

        try:

            files = gridfs_bucket.find({

                "filename": filename
            })

            for file in files:

                try:

                    gridfs_bucket.delete(
                        file._id
                    )

                except Exception:

                    pass

        except Exception:

            pass

    return jsonify({

        "success": True,

        "message": "Issue deleted successfully."
    })


# =========================================================
# SERVE MONGODB GRIDFS IMAGES
# =========================================================

@app.route(
    "/uploads/<path:filename>"
)
def uploaded_file(filename):

    try:

        files = gridfs_bucket.find({

            "filename": filename
        })

        file = next(
            files,
            None
        )

        if not file:

            return jsonify({

                "success": False,

                "message": "Image not found."

            }), 404

        # -------------------------------------------------
        # READ FILE FROM GRIDFS
        # -------------------------------------------------

        output = BytesIO()

        gridfs_bucket.download_to_stream(
            file._id,
            output
        )

        output.seek(0)

        # -------------------------------------------------
        # DETERMINE MIME TYPE
        # -------------------------------------------------

        extension = filename.rsplit(
            ".",
            1
        )[-1].lower()

        mime_types = {

            "png":
                "image/png",

            "jpg":
                "image/jpeg",

            "jpeg":
                "image/jpeg",

            "webp":
                "image/webp"
        }

        mimetype = mime_types.get(

            extension,

            "application/octet-stream"
        )

        return send_file(

            output,

            mimetype=mimetype,

            download_name=filename
        )

    except Exception as error:

        print(
            "IMAGE ERROR:",
            error
        )

        return jsonify({

            "success": False,

            "message": "Unable to load image."

        }), 500


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    app.run(

        debug=True,

        host="127.0.0.1",

        port=5000
    )
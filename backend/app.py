from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

from database import get_db_connection, create_tables

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

UPLOAD_FOLDER = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "uploads"
)

ALLOWED_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp"
}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


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
        and filename.rsplit(".", 1)[1].lower()
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

@app.route("/api/register", methods=["POST"])
def register():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid request data."
        }), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:

        return jsonify({
            "success": False,
            "message": "Name, email and password are required."
        }), 400

    # Hash new passwords
    hashed_password = generate_password_hash(password)

    connection = get_db_connection()

    try:

        connection.execute(
            """
            INSERT INTO users
            (name, email, password, role)
            VALUES (?, ?, ?, ?)
            """,
            (
                name,
                email,
                hashed_password,
                "student"
            )
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Account created successfully!"
        }), 201

    except Exception as error:

        return jsonify({
            "success": False,
            "message": "Email already exists."
        }), 409

    finally:

        connection.close()


# =========================================================
# LOGIN
# =========================================================

@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "message": "Invalid request data."
        }), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:

        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400

    connection = get_db_connection()

    user = connection.execute(
        """
        SELECT
            id,
            name,
            email,
            password,
            role,
            profile_image
        FROM users
        WHERE LOWER(email) = ?
        """,
        (email,)
    ).fetchone()

    connection.close()

    if not user:

        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    stored_password = user["password"]

    password_valid = False

    # -----------------------------------------------------
    # NEW HASHED PASSWORDS
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

        # -------------------------------------------------
        # OLD PLAIN-TEXT PASSWORDS
        # -------------------------------------------------

        else:

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

    return jsonify({
        "success": True,
        "message": "Login successful!",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "profile_image": user["profile_image"]
        }
    }), 200


# =========================================================
# GET USER PROFILE
# =========================================================

@app.route("/api/users/<int:user_id>", methods=["GET"])
def get_user(user_id):

    connection = get_db_connection()

    user = connection.execute(
        """
        SELECT
            id,
            name,
            email,
            role,
            profile_image
        FROM users
        WHERE id = ?
        """,
        (user_id,)
    ).fetchone()

    connection.close()

    if not user:

        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    return jsonify({
        "success": True,
        "user": dict(user)
    })


# =========================================================
# UPDATE USER PROFILE
# =========================================================

@app.route("/api/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "message": "Invalid request data."
        }), 400

    name = data.get("name")
    email = data.get("email")

    if not name or not email:

        return jsonify({
            "success": False,
            "message": "Name and email are required."
        }), 400

    connection = get_db_connection()

    try:

        connection.execute(
            """
            UPDATE users
            SET name = ?, email = ?
            WHERE id = ?
            """,
            (
                name.strip(),
                email.strip().lower(),
                user_id
            )
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Profile updated successfully."
        })

    except Exception:

        return jsonify({
            "success": False,
            "message": "Email may already be in use."
        }), 409

    finally:

        connection.close()


# =========================================================
# GET ALL USERS
# =========================================================

@app.route("/api/users", methods=["GET"])
def get_users():

    connection = get_db_connection()

    users = connection.execute(
        """
        SELECT
            id,
            name,
            email,
            role,
            profile_image
        FROM users
        ORDER BY id DESC
        """
    ).fetchall()

    connection.close()

    return jsonify([
        dict(user)
        for user in users
    ])


# =========================================================
# CREATE ISSUE
# =========================================================

@app.route("/api/issues", methods=["POST"])
def create_issue():

    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    category = request.form.get("category", "").strip()
    location = request.form.get("location", "").strip()
    priority = request.form.get(
        "priority",
        "Medium"
    ).strip()

    reported_by = request.form.get("reported_by")

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

    image_filename = None

    # -----------------------------------------------------
    # OPTIONAL IMAGE
    # -----------------------------------------------------

    if "image" in request.files:

        image = request.files["image"]

        if image and image.filename:

            if not allowed_file(image.filename):

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
                + "_"
                + original_filename
            )

            image.save(
                os.path.join(
                    UPLOAD_FOLDER,
                    image_filename
                )
            )

    connection = get_db_connection()

    try:

        cursor = connection.execute(
            """
            INSERT INTO issues
            (
                title,
                description,
                category,
                location,
                priority,
                status,
                reported_by,
                image_filename
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                title,
                description,
                category,
                location,
                priority,
                "Reported",
                int(reported_by),
                image_filename
            )
        )

        issue_id = cursor.lastrowid

        # -------------------------------------------------
        # SAVE IMAGE IN issue_images TABLE TOO
        # -------------------------------------------------

        if image_filename:

            connection.execute(
                """
                INSERT INTO issue_images
                (
                    issue_id,
                    image_filename
                )
                VALUES (?, ?)
                """,
                (
                    issue_id,
                    image_filename
                )
            )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Issue reported successfully!",
            "issue_id": issue_id
        }), 201

    except Exception as error:

        connection.rollback()

        return jsonify({
            "success": False,
            "message": "Failed to create issue.",
            "error": str(error)
        }), 500

    finally:

        connection.close()


# =========================================================
# GET MY ISSUES
# =========================================================

@app.route("/api/issues/<int:user_id>", methods=["GET"])
def get_my_issues(user_id):

    connection = get_db_connection()

    issues = connection.execute(
        """
        SELECT
            id,
            title,
            description,
            category,
            location,
            priority,
            status,
            reported_by,
            created_at,
            image_filename
        FROM issues
        WHERE reported_by = ?
        ORDER BY id DESC
        """,
        (user_id,)
    ).fetchall()

    result = []

    for issue in issues:

        issue_data = dict(issue)

        # -------------------------------------------------
        # MAIN IMAGE URL
        # -------------------------------------------------

        if issue_data.get("image_filename"):

            issue_data["image_url"] = (
                "http://127.0.0.1:5000/uploads/"
                + issue_data["image_filename"]
            )

        else:

            issue_data["image_url"] = None

        # -------------------------------------------------
        # GET MULTIPLE IMAGES
        # -------------------------------------------------

        images = connection.execute(
            """
            SELECT image_filename
            FROM issue_images
            WHERE issue_id = ?
            ORDER BY id ASC
            """,
            (issue["id"],)
        ).fetchall()

        issue_data["images"] = [
            {
                "filename": image["image_filename"],
                "url":
                    "http://127.0.0.1:5000/uploads/"
                    + image["image_filename"]
            }
            for image in images
        ]

        result.append(issue_data)

    connection.close()

    return jsonify(result)


# =========================================================
# GET ALL ISSUES
# =========================================================

@app.route("/api/issues", methods=["GET"])
def get_all_issues():

    connection = get_db_connection()

    issues = connection.execute(
        """
        SELECT
            issues.id,
            issues.title,
            issues.description,
            issues.category,
            issues.location,
            issues.priority,
            issues.status,
            issues.reported_by,
            issues.created_at,
            issues.image_filename,
            users.name AS user_name,
            users.email AS user_email
        FROM issues
        LEFT JOIN users
        ON issues.reported_by = users.id
        ORDER BY issues.id DESC
        """
    ).fetchall()

    result = []

    for issue in issues:

        issue_data = dict(issue)

        if issue_data.get("image_filename"):

            issue_data["image_url"] = (
                "http://127.0.0.1:5000/uploads/"
                + issue_data["image_filename"]
            )

        else:

            issue_data["image_url"] = None

        images = connection.execute(
            """
            SELECT image_filename
            FROM issue_images
            WHERE issue_id = ?
            ORDER BY id ASC
            """,
            (issue["id"],)
        ).fetchall()

        issue_data["images"] = [
            {
                "filename": image["image_filename"],
                "url":
                    "http://127.0.0.1:5000/uploads/"
                    + image["image_filename"]
            }
            for image in images
        ]

        result.append(issue_data)

    connection.close()

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

    status = data.get("status") if data else None

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

    connection = get_db_connection()

    cursor = connection.execute(
        """
        UPDATE issues
        SET status = ?
        WHERE id = ?
        """,
        (
            status,
            issue_id
        )
    )

    connection.commit()

    updated = cursor.rowcount

    connection.close()

    if updated == 0:

        return jsonify({
            "success": False,
            "message": "Issue not found."
        }), 404

    return jsonify({
        "success": True,
        "message": "Issue status updated successfully."
    })


# =========================================================
# ADMIN STATUS ROUTE
# =========================================================

@app.route(
    "/api/admin/issues/<int:issue_id>/status",
    methods=["PUT"]
)
def admin_update_issue_status(issue_id):

    return update_issue_status(issue_id)


# =========================================================
# UPDATE ISSUE PRIORITY
# =========================================================

@app.route(
    "/api/issues/<int:issue_id>/priority",
    methods=["PUT"]
)
def update_issue_priority(issue_id):

    data = request.get_json()

    priority = data.get("priority") if data else None

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

    connection = get_db_connection()

    cursor = connection.execute(
        """
        UPDATE issues
        SET priority = ?
        WHERE id = ?
        """,
        (
            priority,
            issue_id
        )
    )

    connection.commit()

    updated = cursor.rowcount

    connection.close()

    if updated == 0:

        return jsonify({
            "success": False,
            "message": "Issue not found."
        }), 404

    return jsonify({
        "success": True,
        "message": "Issue priority updated successfully."
    })


# =========================================================
# ADMIN PRIORITY ROUTE
# =========================================================

@app.route(
    "/api/admin/issues/<int:issue_id>/priority",
    methods=["PUT"]
)
def admin_update_issue_priority(issue_id):

    return update_issue_priority(issue_id)


# =========================================================
# DELETE ISSUE
# =========================================================

@app.route(
    "/api/issues/<int:issue_id>",
    methods=["DELETE"]
)
def delete_issue(issue_id):

    connection = get_db_connection()

    # Get issue image
    issue = connection.execute(
        """
        SELECT image_filename
        FROM issues
        WHERE id = ?
        """,
        (issue_id,)
    ).fetchone()

    if not issue:

        connection.close()

        return jsonify({
            "success": False,
            "message": "Issue not found."
        }), 404

    # Get all images
    images = connection.execute(
        """
        SELECT image_filename
        FROM issue_images
        WHERE issue_id = ?
        """,
        (issue_id,)
    ).fetchall()

    # Delete issue_images records
    connection.execute(
        """
        DELETE FROM issue_images
        WHERE issue_id = ?
        """,
        (issue_id,)
    )

    # Delete issue
    connection.execute(
        """
        DELETE FROM issues
        WHERE id = ?
        """,
        (issue_id,)
    )

    connection.commit()

    connection.close()

    # Delete physical files
    filenames = []

    if issue["image_filename"]:
        filenames.append(
            issue["image_filename"]
        )

    for image in images:

        if image["image_filename"] not in filenames:

            filenames.append(
                image["image_filename"]
            )

    for filename in filenames:

        file_path = os.path.join(
            UPLOAD_FOLDER,
            filename
        )

        if os.path.exists(file_path):

            try:
                os.remove(file_path)
            except Exception:
                pass

    return jsonify({
        "success": True,
        "message": "Issue deleted successfully."
    })


# =========================================================
# SERVE UPLOADED IMAGES
# =========================================================

@app.route("/uploads/<filename>")
def uploaded_file(filename):

    return send_from_directory(
        UPLOAD_FOLDER,
        filename
    )


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )
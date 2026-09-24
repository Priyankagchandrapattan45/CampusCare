import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:5000";

function CampusCareLogo({ compact = false, inverse = false }) {
  return (
    <div className={`brand ${inverse ? "brand-inverse" : ""}`} aria-label="CampusCare">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img">
          <path d="M24 5.5c-8.8 0-16 7.2-16 16 0 11.1 16 21 16 21s16-9.9 16-21c0-8.8-7.2-16-16-16Z" />
          <path className="brand-roof" d="m15 22 9-6 9 6v2H15v-2Z" />
          <path className="brand-building" d="M17.5 24h13v10h-13zM21 27h2v4h-2zm4 0h2v4h-2z" />
          <path className="brand-check" d="m19 36 4 4 8-9" />
        </svg>
      </span>
      {!compact && <span className="brand-name">CampusCare</span>}
    </div>
  );
}

function ProfileAvatar({ user, className = "profile-avatar" }) {
  const initial = user?.name?.charAt(0).toUpperCase() || "U";

  return user?.profile_image_url ? (
    <img className={`${className} profile-image`} src={user.profile_image_url} alt={`${user.name} profile`} />
  ) : (
    <div className={className} aria-label={`${user?.name || "User"} initials`}>{initial}</div>
  );
}

function IssueGallery({ images = [], imageUrl }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const gallery = images.length
    ? images
    : imageUrl
      ? [{ id: "legacy", image_url: imageUrl }]
      : [];

  if (!gallery.length) return null;

  const close = () => setActiveIndex(null);
  const previous = () => setActiveIndex((index) => (index - 1 + gallery.length) % gallery.length);
  const next = () => setActiveIndex((index) => (index + 1) % gallery.length);

  return (
    <>
      <div className="issue-gallery" aria-label="Issue photos">
        {gallery.map((image, index) => (
          <button className="gallery-thumb" key={image.id || index} onClick={() => setActiveIndex(index)} aria-label={`Open issue photo ${index + 1}`}>
            <img src={image.image_url} alt={`Issue photo ${index + 1}`} />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Issue photo viewer" onClick={close}>
          <button className="lightbox-close" onClick={close} aria-label="Close photo viewer">×</button>
          <button className="lightbox-nav previous" onClick={(event) => { event.stopPropagation(); previous(); }} aria-label="Previous photo">‹</button>
          <img src={gallery[activeIndex].image_url} alt={`Issue photo ${activeIndex + 1}`} onClick={(event) => event.stopPropagation()} />
          <button className="lightbox-nav next" onClick={(event) => { event.stopPropagation(); next(); }} aria-label="Next photo">›</button>
        </div>
      )}
    </>
  );
}

function App() {

  // =====================================================
  // STATES
  // =====================================================

  const [page, setPage] = useState("home");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");

  const [myIssues, setMyIssues] = useState([]);

  const [allIssues, setAllIssues] = useState([]);

  const [students, setStudents] = useState([]);

  const [adminSection, setAdminSection] =
    useState("overview");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(false);

  const [profile, setProfile] =
    useState(null);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [profileName, setProfileName] =
    useState("");

  const [profileEmail, setProfileEmail] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [selectedImages, setSelectedImages] =
    useState([]);

  const [profileImageFile, setProfileImageFile] =
    useState(null);

  const [profileImagePreview, setProfileImagePreview] =
    useState("");

  const [themeMode, setThemeMode] = useState(() =>
    localStorage.getItem("campuscare_theme") || "light"
  );

  const [settingsSection, setSettingsSection] =
    useState("appearance");

  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("campuscare_settings")
      ) || {
        statusNotifications: true,
        newIssueNotifications: true,
        emailNotifications: false,
        profileVisible: true,
        language: "English",
        defaultPriority: "Medium",
        compactDashboard: false,
      };
    } catch {
      return {
        statusNotifications: true,
        newIssueNotifications: true,
        emailNotifications: false,
        profileVisible: true,
        language: "English",
        defaultPriority: "Medium",
        compactDashboard: false,
      };
    }
  });

  const [settingsMessage, setSettingsMessage] =
    useState("");

  const [deletingIssueId, setDeletingIssueId] =
    useState(null);

  const [deleteMessage, setDeleteMessage] =
    useState("");

  // =====================================================
  // USER
  // =====================================================

  const getUser = () => {

    try {

      return JSON.parse(
        localStorage.getItem(
          "campuscare_user"
        ) || "null"
      );

    } catch {

      return null;

    }
  };

  const user = getUser();

  useEffect(() => {
    const resolvedTheme = themeMode === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : themeMode;

    document.documentElement.dataset.theme = resolvedTheme;
    localStorage.setItem("campuscare_theme", themeMode);
  }, [themeMode]);

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {

    if (page === "dashboard") {
      loadMyIssues();
    }

    if (page === "admin") {
      loadAllIssues();
      loadStudents();
    }

    if (page === "profile" && user) {
      loadProfile();
    }

  }, [page]);

  // =====================================================
  // LOAD MY ISSUES
  // =====================================================

  const loadMyIssues = async () => {

    const savedUser = getUser();

    if (!savedUser) return;

    try {

      const response = await fetch(
        `${API}/api/issues/${savedUser.id}`
      );

      const data =
        await response.json();

      if (response.ok) {
        setMyIssues(data);
      }

    } catch (error) {

      console.error(
        "Error loading issues:",
        error
      );

    }
  };

  // =====================================================
  // LOAD ALL ISSUES
  // =====================================================

  const loadAllIssues = async () => {

    try {

      const response = await fetch(
        `${API}/api/issues`
      );

      const data =
        await response.json();

      if (response.ok) {
        setAllIssues(data);
      }

    } catch (error) {

      console.error(
        "Error loading issues:",
        error
      );

    }
  };

  // =====================================================
  // LOAD STUDENTS
  // =====================================================

  const loadStudents = async () => {

    try {

      const response = await fetch(
        `${API}/api/users`
      );

      const data =
        await response.json();

      if (response.ok) {
        setStudents(data);
      }

    } catch (error) {

      console.error(
        "Error loading students:",
        error
      );

    }
  };

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  const loadProfile = async () => {

    const savedUser = getUser();

    if (!savedUser) return;

    try {

      const response = await fetch(
        `${API}/api/users/${savedUser.id}`
      );

      const data =
        await response.json();

      if (response.ok) {

        setProfile(
          data.user
        );

        setProfileName(
          data.user.name
        );

        setProfileEmail(
          data.user.email
        );
      }

    } catch (error) {

      console.error(
        "Profile error:",
        error
      );

    }
  };

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {

    setFormData({
      ...formData,

      [event.target.name]:
        event.target.value,
    });
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);

    const combinedFiles = [
      ...selectedImages.map((image) => image.file),
      ...files,
    ];

    if (combinedFiles.length > 5) {
      setMessage("You can select up to 5 photos per issue.");
      event.target.value = "";
      return;
    }

    const invalidFile = files.find(
      (file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    );

    if (invalidFile) {
      setMessage("Use PNG, JPG, JPEG, or WEBP images only.");
      event.target.value = "";
      return;
    }

    setMessage("");
    selectedImages.forEach(({ url }) => URL.revokeObjectURL(url));
    setSelectedImages(
      combinedFiles.map((file) => ({
        file,
        name: file.name,
        url: URL.createObjectURL(file),
      }))
    );
    event.target.value = "";
  };

  const removeSelectedImage = (index) => {
    setSelectedImages((images) => {
      URL.revokeObjectURL(images[index].url);
      return images.filter((_, imageIndex) => imageIndex !== index);
    });
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setMessage("Use PNG, JPG, JPEG, or WEBP images only.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Profile images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setMessage("");
    setProfileImageFile(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };

  // =====================================================
  // REGISTER
  // =====================================================

  const handleRegister = async (
    event
  ) => {

    event.preventDefault();
    setMessage("");

    if (
      formData.password !==
      formData.confirmPassword
    ) {

      setMessage(
        "Passwords do not match."
      );

      return;
    }

    try {

      const response = await fetch(
        `${API}/api/register`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name:
              formData.name,

            email:
              formData.email,

            password:
              formData.password,
          }),
        }
      );

      const data =
        await response.json();

      if (response.ok) {

        setMessage(
          "Account created successfully!"
        );

        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });

        setTimeout(() => {

          setMessage("");

          setPage("login");

        }, 1000);

      } else {

        setMessage(
          data.message ||
            "Registration failed."
        );

      }

    } catch {

      setMessage(
        "Cannot connect to Flask server."
      );

    }
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (
    event
  ) => {

    event.preventDefault();
    setMessage("");

    const email =
      event.target.email.value;

    const password =
      event.target.password.value;

    try {

      const response = await fetch(
        `${API}/api/login`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data =
        await response.json();

      if (response.ok) {

        localStorage.setItem(
          "campuscare_user",
          JSON.stringify(
            data.user
          )
        );

        if (
          data.user.role
            .toLowerCase() ===
          "admin"
        ) {

          setAdminSection(
            "overview"
          );

          setPage("admin");

        } else {

          setPage("dashboard");

        }

      } else {
        setMessage(
          data.message ||
            "Invalid email or password"
        );

      }

    } catch {

      setMessage(
        "Cannot connect to Flask server."
      );

    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {

    localStorage.removeItem(
      "campuscare_user"
    );

    setMyIssues([]);

    setAllIssues([]);

    setStudents([]);

    setPage("home");
  };

  const updateSetting = (name, value) => {
    setSettings((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const saveSettings = () => {
    localStorage.setItem(
      "campuscare_settings",
      JSON.stringify(settings)
    );
    setSettingsMessage("Your settings have been saved.");
    window.setTimeout(() => setSettingsMessage(""), 2600);
  };

  const clearLocalAccountData = () => {
    if (!window.confirm("Clear saved CampusCare preferences from this device?")) {
      return;
    }

    localStorage.removeItem("campuscare_settings");
    setSettingsMessage("Saved preferences were cleared from this device.");
  };

  // =====================================================
  // REPORT ISSUE
  // =====================================================

  const submitIssue = async (
    event
  ) => {

    event.preventDefault();

    const savedUser = getUser();

    if (!savedUser) {

      alert(
        "Please login first."
      );

      setPage("login");

      return;
    }

    const form =
      event.target;

    const formData =
      new FormData();

    formData.append(
      "title",
      form.title.value
    );

    formData.append(
      "description",
      form.description.value
    );

    formData.append(
      "category",
      form.category.value
    );

    formData.append(
      "location",
      form.location.value
    );

    formData.append(
      "priority",
      form.priority.value
    );

    formData.append(
      "reported_by",
      savedUser.id
    );

    selectedImages.forEach(({ file }) => {
      formData.append("images", file);
    });

    setLoading(true);

    try {

      const response =
        await fetch(
          `${API}/api/issues`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (response.ok) {

        setMessage(
          "Your issue was reported successfully."
        );

        form.reset();
        selectedImages.forEach(({ url }) => URL.revokeObjectURL(url));
        setSelectedImages([]);

        await loadMyIssues();

        setPage("dashboard");

      } else {

        setMessage(
          data.message ||
            "Failed to report issue."
        );

      }

    } catch {

      setMessage(
        "Cannot connect to Flask server."
      );

    } finally {

      setLoading(false);

    }
  };

  // =====================================================
  // UPDATE STATUS
  // =====================================================

  const updateIssueStatus = async (
    issueId,
    status
  ) => {

    try {

      const response =
        await fetch(
          `${API}/api/issues/${issueId}/status`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              status,
            }),
          }
        );

      if (response.ok) {

        await loadAllIssues();

        await loadMyIssues();

      }

    } catch {

      alert(
        "Unable to update status."
      );

    }
  };

  // =====================================================
  // UPDATE PRIORITY
  // =====================================================

  const updatePriority = async (
    issueId,
    priority
  ) => {

    try {

      const response =
        await fetch(
          `${API}/api/issues/${issueId}/priority`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              priority,
            }),
          }
        );

      if (response.ok) {
        await loadAllIssues();
      }

    } catch {

      alert(
        "Unable to update priority."
      );

    }
  };

  // =====================================================
  // DELETE ISSUE
  // =====================================================

  const deleteIssue = async (
    issueId
  ) => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this issue?"
      );

    if (!confirmDelete)
      return;

    const savedUser = getUser();

    if (!savedUser) {
      setDeleteMessage("Please log in before deleting an issue.");
      return;
    }

    setDeletingIssueId(issueId);
    setDeleteMessage("");

    try {

      const response =
        await fetch(
          `${API}/api/issues/${issueId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requester_id: savedUser.id,
            }),
          }
        );

      const data = await response.json();

      if (response.ok) {

        await loadAllIssues();
        await loadMyIssues();

        setDeleteMessage("Issue deleted successfully.");

      } else {

        setDeleteMessage(
          data.message || "Unable to delete this issue."
        );

      }

    } catch {

      setDeleteMessage("Unable to delete issue.");

    } finally {

      setDeletingIssueId(null);

    }
  };

  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  const updateProfile = async () => {

    const savedUser = getUser();

    if (!savedUser)
      return;

    try {

      const response =
        await fetch(
          `${API}/api/users/${savedUser.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                profileName,

              email:
                profileEmail,
            }),
          }
        );

      const data =
        await response.json();

      if (response.ok) {

        let updatedUser = data.user;

        if (profileImageFile) {
          const imageData = new FormData();
          imageData.append("image", profileImageFile);
          imageData.append("requester_id", savedUser.id);

          const imageResponse = await fetch(
            `${API}/api/users/${savedUser.id}/profile-image`,
            {
              method: "POST",
              body: imageData,
            }
          );

          const imageResult = await imageResponse.json();

          if (!imageResponse.ok) {
            setMessage(imageResult.message || "Unable to save profile picture.");
            return;
          }

          updatedUser = imageResult.user;
        }

        localStorage.setItem(
          "campuscare_user",
          JSON.stringify(
            updatedUser
          )
        );

        setProfile(
          updatedUser
        );

        setProfileImageFile(null);
        setProfileImagePreview("");

        setEditingProfile(
          false
        );

        alert(
          "Profile updated successfully."
        );

      } else {

        alert(
          data.message
        );

      }

    } catch {

      alert(
        "Unable to update profile."
      );

    }
  };

  const removeProfileImage = async () => {
    const savedUser = getUser();

    if (!savedUser || !window.confirm("Remove your profile picture?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/users/${savedUser.id}/profile-image`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requester_id: savedUser.id }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to remove profile picture.");
        return;
      }

      localStorage.setItem("campuscare_user", JSON.stringify(data.user));
      setProfile(data.user);
      setProfileImageFile(null);
      setProfileImagePreview("");
      setMessage("Profile picture removed successfully.");
    } catch {
      setMessage("Unable to remove profile picture.");
    }
  };

  // =====================================================
  // COUNTS
  // =====================================================

  const countIssues = (
    issues,
    status
  ) => {

    return issues.filter(
      (issue) =>
        issue.status === status
    ).length;
  };

  // =====================================================
  // FILTER ADMIN ISSUES
  // =====================================================

  const filteredIssues =
    allIssues.filter(
      (issue) => {

        const search =
          searchTerm.toLowerCase();

        const matchesSearch =
          String(
            issue.title || ""
          )
            .toLowerCase()
            .includes(search)

          ||

          String(
            issue.description || ""
          )
            .toLowerCase()
            .includes(search)

          ||

          String(
            issue.category || ""
          )
            .toLowerCase()
            .includes(search)

          ||

          String(
            issue.location || ""
          )
            .toLowerCase()
            .includes(search)

          ||

          String(
            issue.reporter_name || ""
          )
            .toLowerCase()
            .includes(search);

        const matchesStatus =
          statusFilter === "All" ||
          issue.status ===
            statusFilter;

        const matchesCategory =
          categoryFilter === "All" ||
          issue.category ===
            categoryFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesCategory
        );
      }
    );

  // =====================================================
  // HOME
  // =====================================================

  if (page === "home") {

    return (
      <div className="app">

        <nav className="navbar">

          <CampusCareLogo />

          <div className="nav-links">

            <button
              onClick={() =>
                setPage("home")
              }
            >
              Home
            </button>

            {!user && (
              <>
                <button
                  onClick={() =>
                    setPage("login")
                  }
                >
                  Login
                </button>

                <button
                  className="nav-primary"
                  onClick={() =>
                    setPage(
                      "register"
                    )
                  }
                >
                  Register
                </button>
              </>
            )}

            {user && (
              <>
                <button
                  onClick={() =>
                    setPage(
                      user.role ===
                        "admin"
                        ? "admin"
                        : "dashboard"
                    )
                  }
                >
                  Dashboard
                </button>

                <button
                  className="nav-primary"
                  onClick={
                    logout
                  }
                >
                  Logout
                </button>
              </>
            )}

          </div>

        </nav>

        <section className="hero">

          <div className="hero-content">

            <div className="badge">
              CAMPUS MANAGEMENT SYSTEM
            </div>

            <h1>
              Make Your Campus
              <span>
                Better Together.
              </span>
            </h1>

            <p>
              CampusCare helps students
              report campus problems,
              track complaints and
              create a better campus
              environment.
            </p>

            <div className="hero-buttons">

              <button
                className="primary-btn"
                onClick={() =>
                  user
                    ? setPage(
                        "report"
                      )
                    : setPage(
                        "login"
                      )
                }
              >
                📝 Report an Issue
              </button>

              <button
                className="secondary-btn"
                onClick={() =>
                  user
                    ? setPage(
                        "dashboard"
                      )
                    : setPage(
                        "login"
                      )
                }
              >
                📊 Dashboard
              </button>

            </div>

          </div>

          <div className="hero-card">

            <h2>CampusCare</h2>

            <p>
              Report - Track - Resolve
            </p>

            <div className="hero-stat">

              <strong>
                {user
                  ? myIssues.length
                  : "24/7"}
              </strong>

              <span>
                {user
                  ? "My Issues"
                  : "Campus Support"}
              </span>

            </div>

          </div>

        </section>

        <section className="home-features" id="features">
          <div className="section-intro">
            <p className="eyebrow">A calmer way to care for campus</p>
            <h2>Small reports can create meaningful change.</h2>
            <p>
              CampusCare keeps students and campus teams aligned from the
              first report to the final resolution.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>Report Issues</h3>
              <p>Share a clear report with the right category, location, priority, and photo.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">📍</div>
              <h3>Track Complaints</h3>
              <p>See every update in one place and know exactly where your issue stands.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">🌱</div>
              <h3>Improve Campus</h3>
              <p>Turn collective student feedback into a cleaner, safer, more welcoming campus.</p>
            </article>
          </div>
        </section>

        <footer className="site-footer">
          <div>
            <strong>CampusCare</strong>
            <p>Making campus better, together.</p>
          </div>
          <span>© 2026 CampusCare</span>
        </footer>

      </div>
    );
  }

  // =====================================================
  // LOGIN
  // =====================================================

  if (page === "login") {

    return (
      <div className="auth-page">

        <div className="auth-card">

          <div className="auth-icon">
            🔐
          </div>

          <h1>
            Welcome Back
          </h1>

          <p>
            Login to your CampusCare
            account.
          </p>

          <form
            onSubmit={
              handleLogin
            }
          >

            <label>
              Email
            </label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              required
            />

            <label>
              Password
            </label>

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {message && (
              <div className="feedback-message error-message" role="alert">
                {message}
              </div>
            )}

            <button
              className="primary-btn full"
              type="submit"
            >
              Login
            </button>

          </form>

          <button
            className="text-btn"
            onClick={() =>
              setPage("register")
            }
          >
            Don't have an account?
            Register
          </button>

          <button
            className="back-btn"
            onClick={() =>
              setPage("home")
            }
          >
            ← Back to Home
          </button>

        </div>

      </div>
    );
  }

  // =====================================================
  // REGISTER
  // =====================================================

  if (page === "register") {

    return (
      <div className="auth-page">

        <div className="auth-card">

          <div className="auth-icon"><CampusCareLogo compact /></div>

          <h1>
            Create Account
          </h1>

          <p>
            Join CampusCare today.
          </p>

          <form
            onSubmit={
              handleRegister
            }
          >

            <label>
              Full Name
            </label>

            <input
              name="name"
              value={
                formData.name
              }
              onChange={
                handleChange
              }
              placeholder="Enter your name"
              required
            />

            <label>
              Email
            </label>

            <input
              type="email"
              name="email"
              value={
                formData.email
              }
              onChange={
                handleChange
              }
              placeholder="Enter your email"
              required
            />

            <label>
              Password
            </label>

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <label>
              Confirm Password
            </label>

            <div className="password-field">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              className="primary-btn full"
              type="submit"
            >
              Create Account
            </button>

          </form>

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          <button
            className="text-btn"
            onClick={() =>
              setPage("login")
            }
          >
            Already have an account?
            Login
          </button>

          <button
            className="back-btn"
            onClick={() =>
              setPage("home")
            }
          >
            ← Back to Home
          </button>

        </div>

      </div>
    );
  }

  // =====================================================
  // REPORT ISSUE
  // =====================================================

  if (page === "report") {

    return (
      <div className="auth-page">

        <div className="auth-card large">

          <div className="auth-icon">
            📝
          </div>

          <h1>
            Report Campus Issue
          </h1>

          <p>
            Tell us about the problem.
          </p>

          <form
            onSubmit={
              submitIssue
            }
          >

            <label>
              Issue Title
            </label>

            <input
              name="title"
              placeholder="Example: Broken classroom fan"
              required
            />

            <label>
              Category
            </label>

            <select
              name="category"
              required
            >
              <option value="">
                Select Category
              </option>

              <option>
                Cleanliness
              </option>

              <option>
                Water
              </option>

              <option>
                Electricity
              </option>

              <option>
                Infrastructure
              </option>

              <option>
                Safety
              </option>

              <option>
                Internet
              </option>

              <option>
                Other
              </option>

            </select>

            <label>
              Location
            </label>

            <input
              name="location"
              placeholder="Example: Block A - Room 203"
              required
            />

            <label>
              Priority
            </label>

            <select
              name="priority"
              defaultValue="Medium"
            >

              <option>
                Low
              </option>

              <option>
                Medium
              </option>

              <option>
                High
              </option>

            </select>

            <label>
              Description
            </label>

            <textarea
              name="description"
              rows="5"
              placeholder="Describe the problem..."
              required
            />

            <label>
              📷 Issue Photos
            </label>

            <p className="upload-help">
              Upload up to 5 photos ({selectedImages.length} / 5 selected)
            </p>

            <input
              type="file"
              name="images"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange}
            />

            {selectedImages.length > 0 && (
              <div className="upload-preview-grid">
                {selectedImages.map((image, index) => (
                  <div className="upload-preview" key={image.url}>
                    <img src={image.url} alt={`Selected preview ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-image"
                      onClick={() => removeSelectedImage(index)}
                      aria-label={`Remove ${image.name}`}
                    >
                      ×
                    </button>
                    <span>{image.name}</span>
                  </div>
                ))}
              </div>
            )}

            {message && (
              <div className="feedback-message error-message" role="alert">
                {message}
              </div>
            )}

            <button
              className="primary-btn full"
              disabled={
                loading
              }
            >
              {loading
                ? "Submitting..."
                : "Submit Issue"}
            </button>

          </form>

          <button
            className="back-btn"
            onClick={() =>
              setPage(
                "dashboard"
              )
            }
          >
            ← Back to Dashboard
          </button>

        </div>

      </div>
    );
  }

  // =====================================================
  // SETTINGS
  // =====================================================

  if (page === "settings") {
    if (!user) {
      setPage("login");
      return null;
    }

    const settingsSections = [
      ["appearance", "🎨 Appearance"],
      ["notifications", "🔔 Notifications"],
      ["account", "👤 Account"],
      ["privacy", "🔒 Privacy"],
      ["preferences", "⚙️ Preferences"],
      ["security", "🛡️ Security"],
      ["danger", "⚠️ Danger Zone"],
    ];

    const returnPage = user.role === "admin" ? "admin" : "dashboard";

    return (
      <div className="settings-page">
        <div className="settings-header">
          <div>
            <p className="small-label">CAMPUSCARE SETTINGS</p>
            <h1>Make CampusCare yours.</h1>
            <p>Manage your experience, notifications, and account preferences.</p>
          </div>
          <button className="secondary-btn" onClick={() => setPage(returnPage)}>
            ← Back to {user.role === "admin" ? "Admin" : "Dashboard"}
          </button>
        </div>

        <div className="settings-layout">
          <aside className="settings-nav" aria-label="Settings sections">
            {settingsSections.map(([section, label]) => (
              <button
                key={section}
                className={settingsSection === section ? "settings-nav-btn active" : "settings-nav-btn"}
                onClick={() => setSettingsSection(section)}
              >
                {label}
              </button>
            ))}
          </aside>

          <main className="settings-content">
            {settingsMessage && (
              <div className="settings-success" role="status">✓ {settingsMessage}</div>
            )}

            {settingsSection === "appearance" && (
              <section className="settings-card">
                <div className="settings-card-heading">
                  <div><p className="small-label">DISPLAY</p><h2>Appearance</h2></div>
                  <span className="settings-icon">🎨</span>
                </div>
                <p className="settings-muted">Choose the visual mode that feels best for your daily campus work.</p>
                <div className="theme-options">
                  {[
                    ["light", "Light Mode", "Bright and focused"],
                    ["dark", "Dark Mode", "Easy on the eyes"],
                    ["system", "System Default", "Follow your device"],
                  ].map(([mode, title, detail]) => (
                    <button
                      key={mode}
                      className={themeMode === mode ? "theme-option selected" : "theme-option"}
                      onClick={() => setThemeMode(mode)}
                    >
                      <span className={`theme-preview ${mode}`} />
                      <strong>{title}</strong>
                      <small>{detail}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {settingsSection === "notifications" && (
              <section className="settings-card">
                <div className="settings-card-heading"><div><p className="small-label">UPDATES</p><h2>Notifications</h2></div><span className="settings-icon">🔔</span></div>
                <p className="settings-muted">Stay informed without losing focus.</p>
                {[
                  ["statusNotifications", "Issue status updates", "Get notified when your report moves forward."],
                  ["newIssueNotifications", "New issue alerts", "Receive updates about new campus reports."],
                  ["emailNotifications", "Email notifications", "Allow email updates when available."],
                ].map(([name, title, detail]) => (
                  <label className="setting-row" key={name}>
                    <span><strong>{title}</strong><small>{detail}</small></span>
                    <input type="checkbox" checked={settings[name]} onChange={(event) => updateSetting(name, event.target.checked)} />
                    <i className="toggle-track" aria-hidden="true" />
                  </label>
                ))}
                <button className="primary-btn" onClick={saveSettings}>Save Changes</button>
              </section>
            )}

            {settingsSection === "account" && (
              <section className="settings-card">
                <div className="settings-card-heading"><div><p className="small-label">YOUR ACCOUNT</p><h2>Account Settings</h2></div><span className="settings-icon">👤</span></div>
                <p className="settings-muted">Keep your profile information current.</p>
                <label htmlFor="settings-name">Full name</label>
                <input id="settings-name" value={profileName || user.name || ""} onChange={(event) => setProfileName(event.target.value)} />
                <label htmlFor="settings-email">Email address</label>
                <input id="settings-email" type="email" value={profileEmail || user.email || ""} onChange={(event) => setProfileEmail(event.target.value)} />
                <button className="primary-btn" onClick={updateProfile}>Save Account Details</button>
              </section>
            )}

            {settingsSection === "privacy" && (
              <section className="settings-card">
                <div className="settings-card-heading"><div><p className="small-label">CONTROL</p><h2>Privacy</h2></div><span className="settings-icon">🔒</span></div>
                <p className="settings-muted">Choose how your information is presented within CampusCare.</p>
                <label className="setting-row">
                  <span><strong>Profile visibility</strong><small>Allow campus teams to see your name on submitted issues.</small></span>
                  <input type="checkbox" checked={settings.profileVisible} onChange={(event) => updateSetting("profileVisible", event.target.checked)} />
                  <i className="toggle-track" aria-hidden="true" />
                </label>
                <div className="info-panel"><strong>Account data</strong><p>Your reports and profile are stored securely by the CampusCare backend. Local preferences remain on this device.</p></div>
                <button className="primary-btn" onClick={saveSettings}>Save Privacy Settings</button>
              </section>
            )}

            {settingsSection === "preferences" && (
              <section className="settings-card">
                <div className="settings-card-heading"><div><p className="small-label">WORKFLOW</p><h2>Preferences</h2></div><span className="settings-icon">⚙️</span></div>
                <p className="settings-muted">Set defaults for the way you use CampusCare.</p>
                <label htmlFor="settings-language">Language</label>
                <select id="settings-language" value={settings.language} onChange={(event) => updateSetting("language", event.target.value)}><option>English</option><option>Hindi</option></select>
                <label htmlFor="settings-priority">Default issue priority</label>
                <select id="settings-priority" value={settings.defaultPriority} onChange={(event) => updateSetting("defaultPriority", event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select>
                <label className="setting-row">
                  <span><strong>Compact dashboard cards</strong><small>Show more issues at a glance on larger screens.</small></span>
                  <input type="checkbox" checked={settings.compactDashboard} onChange={(event) => updateSetting("compactDashboard", event.target.checked)} />
                  <i className="toggle-track" aria-hidden="true" />
                </label>
                <button className="primary-btn" onClick={saveSettings}>Save Preferences</button>
              </section>
            )}

            {settingsSection === "security" && (
              <section className="settings-card">
                <div className="settings-card-heading"><div><p className="small-label">PROTECTION</p><h2>Security</h2></div><span className="settings-icon">🛡️</span></div>
                <p className="settings-muted">Review your sign-in information and account access.</p>
                <div className="security-summary"><span>✓</span><div><strong>Account protected</strong><p>Signed in as {user.email}</p></div></div>
                <button className="secondary-btn" onClick={() => setSettingsMessage("Password changes are managed by your campus administrator.")}>Change Password</button>
                <button className="danger-outline" onClick={logout}>Log out of this account</button>
              </section>
            )}

            {settingsSection === "danger" && (
              <section className="settings-card danger-card">
                <div className="settings-card-heading"><div><p className="small-label">IRREVERSIBLE ACTIONS</p><h2>Danger Zone</h2></div><span className="settings-icon">⚠️</span></div>
                <p className="settings-muted">These actions affect saved information on this device. Review carefully before continuing.</p>
                <div className="danger-action"><div><strong>Clear local account data</strong><p>Remove saved theme and preference settings from this browser.</p></div><button className="danger-outline" onClick={clearLocalAccountData}>Clear Data</button></div>
                <div className="danger-action"><div><strong>Delete account</strong><p>Account deletion requires an administrator because no self-service delete endpoint is enabled.</p></div><button className="danger-btn" onClick={() => setSettingsMessage("Please contact a CampusCare administrator to delete your account.")}>Request Deletion</button></div>
              </section>
            )}
          </main>
        </div>
      </div>
    );
  }

  // =====================================================
  // PROFILE
  // =====================================================

  if (page === "profile") {

    return (
      <div className="dashboard-page">

        <div className="top-dashboard">

          <div>

            <h1>
              👤 My Profile
            </h1>

            <p>
              Manage your CampusCare
              account.
            </p>

          </div>

          <button
            className="secondary-btn"
            onClick={() =>
              setPage(
                user.role ===
                  "admin"
                  ? "admin"
                  : "dashboard"
              )
            }
          >
            ← Back
          </button>

        </div>

        <div className="profile-card">

          {profileImagePreview ? (
            <img className="profile-avatar profile-image" src={profileImagePreview} alt="Profile preview" />
          ) : (
            <ProfileAvatar user={profile || user} />
          )}

          {!editingProfile ? (

            <>

              <h2>
                {profile?.name}
              </h2>

              <p>
                📧{" "}
                {profile?.email}
              </p>

              <p>
                👤 Role:{" "}
                {profile?.role}
              </p>

              <button
                className="primary-btn"
                onClick={() =>
                  setEditingProfile(
                    true
                  )
                }
              >
                Edit Profile
              </button>

              {profile?.profile_image_url && (
                <button className="danger-outline profile-remove-btn" onClick={removeProfileImage}>
                  Remove Profile Picture
                </button>
              )}

            </>

          ) : (

            <>

              <label>
                Name
              </label>

              <input
                value={
                  profileName
                }
                onChange={(e) =>
                  setProfileName(
                    e.target.value
                  )
                }
              />

              <label>
                Email
              </label>

              <input
                value={
                  profileEmail
                }
                onChange={(e) =>
                  setProfileEmail(
                    e.target.value
                  )
                }
              />

              <label>
                Profile Picture
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleProfileImageChange}
              />

              {profileImagePreview && (
                <p className="upload-help">Preview ready. Save Changes to update it.</p>
              )}

              <button
                className="primary-btn"
                onClick={
                  updateProfile
                }
              >
                Save Changes
              </button>

              <button
                className="back-btn"
                onClick={() => {
                  setProfileName(profile?.name || "");
                  setProfileEmail(profile?.email || "");
                  setEditingProfile(false);
                }}
              >
                Cancel
              </button>

            </>

          )}

        </div>

      </div>
    );
  }

  // =====================================================
  // STUDENT DASHBOARD
  // =====================================================

  if (page === "dashboard") {

    if (!user) {

      setPage("login");

      return null;
    }

    return (
      <div className="app">

        <nav className="navbar">

          <CampusCareLogo />

          <div className="nav-links">

            <button
              onClick={() =>
                setPage("home")
              }
            >
              Home
            </button>

            <button
              onClick={() =>
                setPage("profile")
              }
            >
              <ProfileAvatar user={user} className="nav-avatar" />
              Profile
            </button>

            <button
              onClick={() => {
                setSettingsSection("appearance");
                setPage("settings");
              }}
            >
              ⚙️ Settings
            </button>

            <button
              className="nav-primary"
              onClick={
                logout
              }
            >
              Logout
            </button>

          </div>

        </nav>

        <section className="dashboard-page">

          <div className="top-dashboard">

            <div>

              <p className="small-label">
                STUDENT DASHBOARD
              </p>

              <h1>
                Welcome,{" "}
                {user.name}! 👋
              </h1>

              <p>
                Track and manage your
                campus reports.
              </p>

            </div>

            <button
              className="primary-btn"
              onClick={() =>
                setPage(
                  "report"
                )
              }
            >
              + Report Issue
            </button>

          </div>

          {/* STATISTICS */}

          <div className="stats-grid">

            <div className="stat-card">

              <span>
                📋
              </span>

              <strong>
                {myIssues.length}
              </strong>

              <p>
                Total Issues
              </p>

            </div>

            <div className="stat-card">

              <span>
                📢
              </span>

              <strong>
                {countIssues(
                  myIssues,
                  "Reported"
                )}
              </strong>

              <p>
                Reported
              </p>

            </div>

            <div className="stat-card">

              <span>
                🔄
              </span>

              <strong>
                {countIssues(
                  myIssues,
                  "In Progress"
                )}
              </strong>

              <p>
                In Progress
              </p>

            </div>

            <div className="stat-card">

              <span>
                ✅
              </span>

              <strong>
                {countIssues(
                  myIssues,
                  "Resolved"
                )}
              </strong>

              <p>
                Resolved
              </p>

            </div>

          </div>

          {deleteMessage && (
            <div className="feedback-message success-message" role="status">
              {deleteMessage}
            </div>
          )}

          {/* ISSUES */}

          <div className="section-card">

            <div className="section-heading">

              <div>

                <h2>
                  📋 My Issues
                </h2>

                <p>
                  Your reported campus
                  problems.
                </p>

              </div>

              <button
                className="secondary-btn"
                onClick={
                  loadMyIssues
                }
              >
                🔄 Refresh
              </button>

            </div>

            {myIssues.length ===
            0 ? (

              <div className="empty-state">

                <div>
                  📭
                </div>

                <h3>
                  No issues yet
                </h3>

                <p>
                  You haven't reported
                  any campus issues.
                </p>

                <button
                  className="primary-btn"
                  onClick={() =>
                    setPage(
                      "report"
                    )
                  }
                >
                  Report Your First Issue
                </button>

              </div>

            ) : (

              <div className="issue-grid">

                {myIssues.map(
                  (issue) => (

                    <div
                      className="issue-card"
                      key={
                        issue.id
                      }
                    >

                      <IssueGallery images={issue.images} imageUrl={issue.image_url} />

                      <div className="issue-card-top">

                        <h3>
                          {issue.title}
                        </h3>

                        <span
                          className={`status ${issue.status
                            .toLowerCase()
                            .replace(
                              " ",
                              "-"
                            )}`}
                        >
                          {issue.status}
                        </span>

                      </div>

                      <p>
                        {issue.description}
                      </p>

                      <div className="issue-info">

                        <span>
                          📂{" "}
                          {issue.category}
                        </span>

                        <span>
                          📍{" "}
                          {issue.location}
                        </span>

                        <span className={`priority priority-${String(issue.priority || "Medium").toLowerCase()}`}>
                          ⚠️{" "}
                          {issue.priority}
                        </span>

                      </div>

                      <button
                        className="delete-btn issue-delete-btn"
                        disabled={deletingIssueId === issue.id}
                        onClick={() => deleteIssue(issue.id)}
                      >
                        {deletingIssueId === issue.id
                          ? "Deleting..."
                          : "🗑️ Delete Issue"}
                      </button>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </section>

      </div>
    );
  }

  // =====================================================
  // ADMIN DASHBOARD
  // =====================================================

  if (page === "admin") {

    if (
      !user ||
      user.role !== "admin"
    ) {

      setPage("login");

      return null;
    }

    const total =
      allIssues.length;

    const reported =
      countIssues(
        allIssues,
        "Reported"
      );

    const progress =
      countIssues(
        allIssues,
        "In Progress"
      );

    const resolved =
      countIssues(
        allIssues,
        "Resolved"
      );

    const resolutionRate =
      total === 0
        ? 0
        : Math.round(
            (resolved / total) *
              100
          );

    return (
      <div className="admin-layout">

        {/* SIDEBAR */}

        <aside className="sidebar">

          <div className="sidebar-logo"><CampusCareLogo inverse /></div>

          <p className="sidebar-title">
            ADMIN PANEL
          </p>

          <button
            className={
              adminSection ===
              "overview"
                ? "sidebar-btn active"
                : "sidebar-btn"
            }
            onClick={() =>
              setAdminSection(
                "overview"
              )
            }
          >
            📊 Overview
          </button>

          <button
            className={
              adminSection ===
              "issues"
                ? "sidebar-btn active"
                : "sidebar-btn"
            }
            onClick={() =>
              setAdminSection(
                "issues"
              )
            }
          >
            📋 Issues
          </button>

          <button
            className={
              adminSection ===
              "students"
                ? "sidebar-btn active"
                : "sidebar-btn"
            }
            onClick={() =>
              setAdminSection(
                "students"
              )
            }
          >
            👥 Students
          </button>

          <button
            className={
              adminSection ===
              "profile"
                ? "sidebar-btn active"
                : "sidebar-btn"
            }
            onClick={() =>
              setAdminSection(
                "profile"
              )
            }
          >
            👤 Profile
          </button>

          <button
            className="sidebar-btn"
            onClick={() => {
              setSettingsSection("appearance");
              setPage("settings");
            }}
          >
            ⚙️ Settings
          </button>

          <div className="sidebar-bottom">

            <button
              className="sidebar-btn"
              onClick={() =>
                setPage("home")
              }
            >
              🏠 Home
            </button>

            <button
              className="sidebar-btn logout-side"
              onClick={
                logout
              }
            >
              🚪 Logout
            </button>

          </div>

        </aside>

        {/* MAIN */}

        <main className="admin-main">

          <div className="admin-topbar">

            <div>

              <p className="small-label">
                ADMINISTRATOR
              </p>

              <h1>
                {adminSection ===
                  "overview" &&
                  "Dashboard Overview"}

                {adminSection ===
                  "issues" &&
                  "Issue Management"}

                {adminSection ===
                  "students" &&
                  "Student Management"}

                {adminSection ===
                  "profile" &&
                  "Admin Profile"}
              </h1>

            </div>

            <div className="admin-user">

              <ProfileAvatar user={user} className="admin-avatar" />

              <div>

                <strong>
                  {user.name}
                </strong>

                <span>
                  Administrator
                </span>

              </div>

            </div>

          </div>

          {deleteMessage && (
            <div className="feedback-message success-message" role="status">
              {deleteMessage}
            </div>
          )}

          {/* OVERVIEW */}

          {adminSection ===
            "overview" && (

            <>

              <div className="stats-grid">

                <div className="stat-card">
                  <span>
                    📋
                  </span>

                  <strong>
                    {total}
                  </strong>

                  <p>
                    Total Issues
                  </p>
                </div>

                <div className="stat-card">
                  <span>
                    📢
                  </span>

                  <strong>
                    {reported}
                  </strong>

                  <p>
                    Reported
                  </p>
                </div>

                <div className="stat-card">
                  <span>
                    🔄
                  </span>

                  <strong>
                    {progress}
                  </strong>

                  <p>
                    In Progress
                  </p>
                </div>

                <div className="stat-card">
                  <span>
                    ✅
                  </span>

                  <strong>
                    {resolved}
                  </strong>

                  <p>
                    Resolved
                  </p>
                </div>

              </div>

              {/* CHART */}

              <div className="admin-grid">

                <div className="section-card">

                  <h2>
                    📊 Issue Status
                  </h2>

                  <div className="bar-chart">

                    <div className="bar-row">

                      <span>
                        Reported
                      </span>

                      <div className="bar">
                        <div
                          className="bar-fill"
                          style={{
                            width:
                              total
                                ? `${(
                                    reported /
                                    total
                                  ) *
                                  100}%`
                                : "0%",
                          }}
                        />
                      </div>

                      <strong>
                        {reported}
                      </strong>

                    </div>

                    <div className="bar-row">

                      <span>
                        In Progress
                      </span>

                      <div className="bar">
                        <div
                          className="bar-fill"
                          style={{
                            width:
                              total
                                ? `${(
                                    progress /
                                    total
                                  ) *
                                  100}%`
                                : "0%",
                          }}
                        />
                      </div>

                      <strong>
                        {progress}
                      </strong>

                    </div>

                    <div className="bar-row">

                      <span>
                        Resolved
                      </span>

                      <div className="bar">
                        <div
                          className="bar-fill"
                          style={{
                            width:
                              total
                                ? `${(
                                    resolved /
                                    total
                                  ) *
                                  100}%`
                                : "0%",
                          }}
                        />
                      </div>

                      <strong>
                        {resolved}
                      </strong>

                    </div>

                  </div>

                </div>

                <div className="section-card">

                  <h2>
                    🎯 Resolution Rate
                  </h2>

                  <div className="circle-progress">

                    <div
                      style={{
                        "--progress": `${resolutionRate * 3.6}deg`,
                      }}
                    >
                      {resolutionRate}%
                    </div>

                  </div>

                  <p className="center-text">
                    Issues resolved
                  </p>

                </div>

              </div>

              {/* CATEGORY */}

              <div className="section-card">

                <h2>
                  📂 Issues by Category
                </h2>

                {[
                  "Cleanliness",
                  "Water",
                  "Electricity",
                  "Infrastructure",
                  "Safety",
                  "Internet",
                  "Other",
                ].map(
                  (category) => {

                    const count =
                      allIssues.filter(
                        (issue) =>
                          issue.category ===
                          category
                      ).length;

                    return (
                      <div
                        className="category-row"
                        key={
                          category
                        }
                      >

                        <span>
                          {category}
                        </span>

                        <strong>
                          {count}
                        </strong>

                      </div>
                    );

                  }
                )}

              </div>

            </>
          )}

          {/* ISSUES */}

          {adminSection ===
            "issues" && (

            <>

              <div className="filter-card">

                <input
                  placeholder="🔎 Search issues..."
                  value={
                    searchTerm
                  }
                  onChange={(e) =>
                    setSearchTerm(
                      e.target
                        .value
                    )
                  }
                />

                <select
                  value={
                    statusFilter
                  }
                  onChange={(e) =>
                    setStatusFilter(
                      e.target
                        .value
                    )
                  }
                >

                  <option>
                    All
                  </option>

                  <option>
                    Reported
                  </option>

                  <option>
                    In Progress
                  </option>

                  <option>
                    Resolved
                  </option>

                </select>

                <select
                  value={
                    categoryFilter
                  }
                  onChange={(e) =>
                    setCategoryFilter(
                      e.target
                        .value
                    )
                  }
                >

                  <option>
                    All
                  </option>

                  <option>
                    Cleanliness
                  </option>

                  <option>
                    Water
                  </option>

                  <option>
                    Electricity
                  </option>

                  <option>
                    Infrastructure
                  </option>

                  <option>
                    Safety
                  </option>

                  <option>
                    Internet
                  </option>

                  <option>
                    Other
                  </option>

                </select>

                <button
                  className="secondary-btn"
                  onClick={
                    loadAllIssues
                  }
                >
                  🔄
                </button>

              </div>

              <div className="issue-grid admin-issues">

                {filteredIssues.length ===
                0 ? (

                  <div className="empty-state">

                    <div>
                      📭
                    </div>

                    <h3>
                      No issues found
                    </h3>

                  </div>

                ) : (

                  filteredIssues.map(
                    (issue) => (

                      <div
                        className="issue-card admin-issue-card"
                        key={
                          issue.id
                        }
                      >

                        <IssueGallery images={issue.images} imageUrl={issue.image_url} />

                        <div className="issue-card-top">

                          <h3>
                            {issue.title}
                          </h3>

                          <span
                            className={`status ${issue.status
                              .toLowerCase()
                              .replace(
                                " ",
                                "-"
                              )}`}
                          >
                            {issue.status}
                          </span>

                        </div>

                        <p>
                          {issue.description}
                        </p>

                        <div className="issue-info">

                          <span>
                            👤{" "}
                            {issue.reporter_name}
                          </span>

                          <span>
                            📧{" "}
                            {issue.reporter_email}
                          </span>

                          <span>
                            📂{" "}
                            {issue.category}
                          </span>

                          <span>
                            📍{" "}
                            {issue.location}
                          </span>

                          <span className={`priority priority-${String(issue.priority || "Medium").toLowerCase()}`}>
                            ⚠️{" "}
                            {issue.priority}
                          </span>

                        </div>

                        <div className="admin-controls">

                          <label>
                            Status
                          </label>

                          <select
                            value={
                              issue.status
                            }
                            onChange={(e) =>
                              updateIssueStatus(
                                issue.id,
                                e.target
                                  .value
                              )
                            }
                          >

                            <option>
                              Reported
                            </option>

                            <option>
                              In Progress
                            </option>

                            <option>
                              Resolved
                            </option>

                          </select>

                          <label>
                            Priority
                          </label>

                          <select
                            value={
                              issue.priority
                            }
                            onChange={(e) =>
                              updatePriority(
                                issue.id,
                                e.target
                                  .value
                              )
                            }
                          >

                            <option>
                              Low
                            </option>

                            <option>
                              Medium
                            </option>

                            <option>
                              High
                            </option>

                          </select>

                          <button
                            className="delete-btn"
                            disabled={deletingIssueId === issue.id}
                            onClick={() =>
                              deleteIssue(
                                issue.id
                              )
                            }
                          >
                            {deletingIssueId === issue.id
                              ? "Deleting..."
                              : "🗑️ Delete"}
                          </button>

                        </div>

                      </div>

                    )
                  )

                )}

              </div>

            </>
          )}

          {/* STUDENTS */}

          {adminSection ===
            "students" && (

            <div className="section-card">

              <div className="section-heading">

                <div>

                  <h2>
                    👥 Registered Students
                  </h2>

                  <p>
                    {students.length} students
                    registered.
                  </p>

                </div>

                <button
                  className="secondary-btn"
                  onClick={
                    loadStudents
                  }
                >
                  🔄 Refresh
                </button>

              </div>

              {students.length === 0 ? (
                <div className="empty-state compact-empty">
                  <div>👥</div>
                  <h3>No students found</h3>
                  <p>Registered student accounts will appear here.</p>
                </div>
              ) : (
              <div className="student-grid">

                {students.map(
                  (student) => (

                    <div
                      className="student-card"
                      key={
                        student.id
                      }
                    >

                      <ProfileAvatar user={student} className="student-avatar" />

                      <div>

                        <h3>
                          {student.name}
                        </h3>

                        <p>
                          📧{" "}
                          {student.email}
                        </p>

                        <span>
                          🎓 Student
                        </span>

                      </div>

                    </div>

                  )
                )}

              </div>
              )}

            </div>
          )}

          {/* ADMIN PROFILE */}

          {adminSection ===
            "profile" && (

            <div className="profile-card">

              <ProfileAvatar user={user} className="profile-avatar" />

              <h2>
                {user.name}
              </h2>

              <p>
                📧 {user.email}
              </p>

              <p>
                🛠️ Administrator
              </p>

              <button
                className="primary-btn"
                onClick={() =>
                  setPage(
                    "profile"
                  )
                }
              >
                Edit Profile
              </button>

            </div>
          )}

        </main>

      </div>
    );
  }

  return null;
}

export default App;
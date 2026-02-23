import type { Express } from "express";
import { db } from "./db";
import { users, otpVerifications, subscriptions } from "@shared/schema";
import { conversations, messages, quizAttempts, dailyTopics, notes } from "@shared/schema";
import { eq, sql, desc, count, inArray, and } from "drizzle-orm";

const ADMIN_USER = "admin";
const ADMIN_PASS = "123";

function basicAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Authentication required");
  }
  const decoded = Buffer.from(auth.split(" ")[1], "base64").toString();
  const [user, pass] = decoded.split(":");
  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Invalid credentials");
  }
  next();
}

export function registerAdminRoutes(app: Express) {
  app.get("/admin/api/stats", basicAuth, async (_req, res) => {
    try {
      const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      const [subCount] = await db.select({ count: sql<number>`count(*)::int` }).from(subscriptions).where(eq(subscriptions.status, "active"));
      const [chatCount] = await db.select({ count: sql<number>`count(*)::int` }).from(conversations);
      const [quizCount] = await db.select({ count: sql<number>`count(*)::int` }).from(quizAttempts);
      const [noteCount] = await db.select({ count: sql<number>`count(*)::int` }).from(notes);

      res.json({
        totalUsers: userCount?.count || 0,
        activeSubscriptions: subCount?.count || 0,
        totalChats: chatCount?.count || 0,
        totalQuizAttempts: quizCount?.count || 0,
        totalNotes: noteCount?.count || 0,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/admin/api/users", basicAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = (req.query.search as string) || "";
      const offset = (page - 1) * limit;

      let whereClause = sql`1=1`;
      if (search) {
        whereClause = sql`(${users.phone} ILIKE ${"%" + search + "%"} OR ${users.displayName} ILIKE ${"%" + search + "%"} OR ${users.email} ILIKE ${"%" + search + "%"})`;
      }

      const allUsers = await db
        .select({
          id: users.id,
          phone: users.phone,
          email: users.email,
          displayName: users.displayName,
          isAdmin: users.isAdmin,
          onboardingCompleted: users.onboardingCompleted,
          language: users.language,
          targetExams: users.targetExams,
          userType: users.userType,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause);

      const userIds = allUsers.map((u) => u.id);

      const chatCounts = userIds.length > 0
        ? await db
            .select({
              userId: conversations.userId,
              count: sql<number>`count(*)::int`,
            })
            .from(conversations)
            .where(inArray(conversations.userId, userIds))
            .groupBy(conversations.userId)
        : [];

      const quizCounts = userIds.length > 0
        ? await db
            .select({
              userId: quizAttempts.userId,
              attempts: sql<number>`count(*)::int`,
              totalQuestions: sql<number>`coalesce(sum(${quizAttempts.totalQuestions}), 0)::int`,
              totalCorrect: sql<number>`coalesce(sum(${quizAttempts.score}), 0)::int`,
            })
            .from(quizAttempts)
            .where(inArray(quizAttempts.userId, userIds))
            .groupBy(quizAttempts.userId)
        : [];

      const noteCounts = userIds.length > 0
        ? await db
            .select({
              userId: notes.userId,
              count: sql<number>`count(*)::int`,
            })
            .from(notes)
            .where(inArray(notes.userId, userIds))
            .groupBy(notes.userId)
        : [];

      const subData = userIds.length > 0
        ? await db
            .select({
              userId: subscriptions.userId,
              status: subscriptions.status,
              plan: subscriptions.plan,
              currentPeriodEnd: subscriptions.currentPeriodEnd,
              amount: subscriptions.amount,
            })
            .from(subscriptions)
            .where(and(inArray(subscriptions.userId, userIds), eq(subscriptions.status, "active")))
        : [];

      const chatMap = Object.fromEntries(chatCounts.map((c) => [c.userId, c.count]));
      const quizMap = Object.fromEntries(quizCounts.map((q) => [q.userId, q]));
      const noteMap = Object.fromEntries(noteCounts.map((n) => [n.userId, n.count]));
      const subMap = Object.fromEntries(subData.map((s) => [s.userId, s]));

      const enrichedUsers = allUsers.map((u) => ({
        ...u,
        chats: chatMap[u.id] || 0,
        quizAttempts: quizMap[u.id]?.attempts || 0,
        quizQuestions: quizMap[u.id]?.totalQuestions || 0,
        quizCorrect: quizMap[u.id]?.totalCorrect || 0,
        notes: noteMap[u.id] || 0,
        subscription: subMap[u.id] || null,
      }));

      res.json({
        users: enrichedUsers,
        total: totalResult?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((totalResult?.count || 0) / limit),
      });
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/admin", basicAuth, (_req, res) => {
    res.send(getAdminHtml());
  });

  app.get("/admin/{*path}", basicAuth, (_req, res) => {
    res.send(getAdminHtml());
  });
}

function getAdminHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Learnpro AI - Admin Panel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
    .header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    .header h1 { font-size: 20px; font-weight: 700; color: #2563eb; }
    .header h1 span { color: #1e293b; }
    .badge { background: #dbeafe; color: #2563eb; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .container { max-width: 1400px; margin: 0 auto; padding: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .stat-card { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
    .stat-card .label { font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .stat-card .value { font-size: 28px; font-weight: 700; color: #1e293b; }
    .search-bar { display: flex; gap: 12px; margin-bottom: 20px; }
    .search-bar input { flex: 1; padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; }
    .search-bar input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    .search-bar button { padding: 10px 20px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .search-bar button:hover { background: #1d4ed8; }
    .table-wrapper { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 900px; }
    th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
    td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
    tr:hover td { background: #f8fafc; }
    .user-name { font-weight: 600; color: #1e293b; }
    .user-phone { color: #64748b; font-size: 13px; }
    .tag { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .tag-active { background: #dcfce7; color: #16a34a; }
    .tag-free { background: #f1f5f9; color: #64748b; }
    .tag-admin { background: #fef3c7; color: #d97706; }
    .tag-plan { background: #dbeafe; color: #2563eb; }
    .pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; }
    .pagination button { padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; cursor: pointer; font-size: 14px; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination button.active { background: #2563eb; color: #fff; border-color: #2563eb; }
    .pagination span { font-size: 14px; color: #64748b; }
    .loading { text-align: center; padding: 40px; color: #64748b; }
    .consumption { display: flex; gap: 6px; flex-wrap: wrap; }
    .consumption .chip { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    @media (max-width: 768px) {
      .container { padding: 12px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .stat-card { padding: 14px; }
      .stat-card .value { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1><span>Learnpro</span> AI <span style="font-weight:400;font-size:14px;color:#64748b;margin-left:8px;">Admin Panel</span></h1>
    <span class="badge">Secure Access</span>
  </div>
  <div class="container">
    <div class="stats-grid" id="stats-grid">
      <div class="stat-card"><div class="label">Total Users</div><div class="value" id="stat-users">-</div></div>
      <div class="stat-card"><div class="label">Active Subscriptions</div><div class="value" id="stat-subs">-</div></div>
      <div class="stat-card"><div class="label">Total Chats</div><div class="value" id="stat-chats">-</div></div>
      <div class="stat-card"><div class="label">Quiz Attempts</div><div class="value" id="stat-quizzes">-</div></div>
      <div class="stat-card"><div class="label">Notes Created</div><div class="value" id="stat-notes">-</div></div>
    </div>
    <div class="search-bar">
      <input type="text" id="search-input" placeholder="Search by phone, name, or email..." />
      <button onclick="searchUsers()">Search</button>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>Type</th>
            <th>Exams</th>
            <th>Chats</th>
            <th>Quizzes</th>
            <th>Notes</th>
            <th>Subscription</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody id="users-tbody"><tr><td colspan="9" class="loading">Loading...</td></tr></tbody>
      </table>
    </div>
    <div class="pagination" id="pagination"></div>
  </div>
  <script>
    let currentPage = 1;
    const limit = 50;
    const authHeader = "Basic " + btoa("admin:123");
    const headers = { "Authorization": authHeader };

    async function loadStats() {
      try {
        const res = await fetch("/admin/api/stats", { headers });
        const d = await res.json();
        document.getElementById("stat-users").textContent = d.totalUsers;
        document.getElementById("stat-subs").textContent = d.activeSubscriptions;
        document.getElementById("stat-chats").textContent = d.totalChats;
        document.getElementById("stat-quizzes").textContent = d.totalQuizAttempts;
        document.getElementById("stat-notes").textContent = d.totalNotes;
      } catch (e) { console.error(e); }
    }

    async function loadUsers(page, search) {
      currentPage = page || 1;
      const tbody = document.getElementById("users-tbody");
      tbody.innerHTML = '<tr><td colspan="9" class="loading">Loading...</td></tr>';
      try {
        const q = new URLSearchParams({ page: currentPage, limit, search: search || "" });
        const res = await fetch("/admin/api/users?" + q.toString(), { headers });
        const d = await res.json();
        if (!d.users || d.users.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" class="loading">No users found</td></tr>';
          document.getElementById("pagination").innerHTML = "";
          return;
        }
        tbody.innerHTML = d.users.map((u, i) => {
          const idx = (currentPage - 1) * limit + i + 1;
          const name = u.displayName || "—";
          const contact = u.phone || u.email || "—";
          const type = u.userType ? u.userType.replace(/_/g, " ") : "—";
          const exams = (u.targetExams && u.targetExams.length) ? u.targetExams.join(", ") : "—";
          const accuracy = u.quizQuestions > 0 ? Math.round((u.quizCorrect / u.quizQuestions) * 100) : 0;
          const quizInfo = u.quizAttempts > 0 ? u.quizAttempts + " (" + u.quizQuestions + "Q, " + accuracy + "%)" : "0";
          let subHtml = '<span class="tag tag-free">Free</span>';
          if (u.isAdmin) subHtml = '<span class="tag tag-admin">Admin</span>';
          if (u.subscription) {
            const exp = u.subscription.currentPeriodEnd ? new Date(u.subscription.currentPeriodEnd).toLocaleDateString() : "";
            subHtml = '<span class="tag tag-plan">' + (u.subscription.plan || "active") + '</span>' + (exp ? ' <span style="font-size:11px;color:#64748b;">till ' + exp + '</span>' : "");
          }
          const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—";
          return "<tr>" +
            "<td>" + idx + "</td>" +
            '<td><div class="user-name">' + esc(name) + '</div><div class="user-phone">' + esc(contact) + "</div></td>" +
            "<td>" + esc(type) + "</td>" +
            "<td style='max-width:180px;overflow:hidden;text-overflow:ellipsis;'>" + esc(exams) + "</td>" +
            "<td>" + u.chats + "</td>" +
            "<td>" + quizInfo + "</td>" +
            "<td>" + u.notes + "</td>" +
            "<td>" + subHtml + "</td>" +
            "<td>" + joined + "</td>" +
            "</tr>";
        }).join("");

        let pagHtml = "";
        pagHtml += '<button onclick="loadUsers(' + (currentPage - 1) + ', getSearch())" ' + (currentPage <= 1 ? "disabled" : "") + '>&laquo; Prev</button>';
        pagHtml += '<span>Page ' + currentPage + ' of ' + d.totalPages + ' (' + d.total + ' users)</span>';
        pagHtml += '<button onclick="loadUsers(' + (currentPage + 1) + ', getSearch())" ' + (currentPage >= d.totalPages ? "disabled" : "") + '>Next &raquo;</button>';
        document.getElementById("pagination").innerHTML = pagHtml;
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="9" class="loading">Error loading users</td></tr>';
      }
    }

    function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
    function getSearch() { return document.getElementById("search-input").value.trim(); }
    function searchUsers() { loadUsers(1, getSearch()); }

    document.getElementById("search-input").addEventListener("keydown", function(e) {
      if (e.key === "Enter") searchUsers();
    });

    loadStats();
    loadUsers(1, "");
  </script>
</body>
</html>`;
}

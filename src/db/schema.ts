import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  varchar,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const monitors = pgTable("monitors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // http, tcp, ping, dns
  url: text("url").notNull(),
  interval: integer("interval").notNull().default(60),
  timeout: integer("timeout").notNull().default(30),
  retries: integer("retries").notNull().default(1),
  active: boolean("active").notNull().default(true),
  // HTTP-specific
  method: varchar("method", { length: 10 }).default("GET"),
  acceptedStatusCodes: text("accepted_status_codes").array().default(["200-299"]),
  keyword: text("keyword"),
  // DNS-specific
  dnsResolveType: varchar("dns_resolve_type", { length: 10 }),
  dnsResolveServer: varchar("dns_resolve_server", { length: 255 }),
  // Notification
  maxRedirects: integer("max_redirects").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const heartbeats = pgTable(
  "heartbeats",
  {
    id: serial("id").primaryKey(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    status: integer("status").notNull(), // 1 = up, 0 = down, 2 = pending
    ping: integer("ping"), // response time in ms
    msg: text("msg"),
    time: timestamp("time").defaultNow().notNull(),
  },
  (table) => ({
    monitorIdIdx: index("heartbeats_monitor_id_idx").on(table.monitorId),
    timeIdx: index("heartbeats_time_idx").on(table.time),
    monitorTimeIdx: index("heartbeats_monitor_time_idx").on(table.monitorId, table.time),
  })
);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // telegram, discord, email, webhook
  config: jsonb("config").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const monitorNotifications = pgTable(
  "monitor_notifications",
  {
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    notificationId: integer("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.monitorId, table.notificationId] }),
  })
);

export const statusPages = pgTable("status_pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  public: boolean("public").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const statusPageMonitors = pgTable(
  "status_page_monitors",
  {
    statusPageId: integer("status_page_id")
      .notNull()
      .references(() => statusPages.id, { onDelete: "cascade" }),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.statusPageId, table.monitorId] }),
  })
);

export const incidents = pgTable(
  "incidents",
  {
    id: serial("id").primaryKey(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    cause: text("cause"),
  },
  (table) => ({
    monitorIdIdx: index("incidents_monitor_id_idx").on(table.monitorId),
  })
);

export type Monitor = typeof monitors.$inferSelect;
export type NewMonitor = typeof monitors.$inferInsert;
export type Heartbeat = typeof heartbeats.$inferSelect;
export type NewHeartbeat = typeof heartbeats.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type StatusPage = typeof statusPages.$inferSelect;
export type NewStatusPage = typeof statusPages.$inferInsert;
export type Incident = typeof incidents.$inferSelect;
export type User = typeof users.$inferSelect;

import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const rooms=sqliteTable('rooms',{id:text('id').primaryKey(),invite:text('invite').notNull().unique()});
export const members=sqliteTable('members',{id:text('id').primaryKey(),room:text('room').notNull(),name:text('name').notNull()});
export const entries=sqliteTable('entries',{id:text('id').primaryKey(),room:text('room').notNull(),author:text('author').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),created:integer('created').notNull()});
export const subscriptions=sqliteTable('subscriptions',{endpoint:text('endpoint').primaryKey(),user:text('user').notNull(),data:text('data').notNull()});

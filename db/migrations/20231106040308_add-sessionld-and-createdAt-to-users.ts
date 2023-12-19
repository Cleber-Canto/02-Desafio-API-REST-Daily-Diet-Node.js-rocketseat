/* eslint-disable prettier/prettier */
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.uuid('session_id').after('height').index();

    table
      .timestamp('created_at', { precision: 6, useTz: true }) // Removendo o defaultTo e definindo o valor padrão na próxima linha
      .defaultTo(knex.fn.now(6)) // Definindo o valor padrão usando defaultTo
      .after('session_id')
      .notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('session_id');
    table.dropColumn('created_at');
  });
}

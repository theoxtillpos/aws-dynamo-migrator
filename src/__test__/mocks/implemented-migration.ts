import { Migration } from '../../types';

export default class HelloMigration extends Migration {
  static async up() {
    console.log('Hello World!');
  }

  static async down() {
    console.log('Goodbye World!');
  }
}

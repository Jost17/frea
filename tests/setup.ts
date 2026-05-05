// Test setup — runs before each test file via bunfig.toml preload
// Set test DB path to in-memory SQLite
process.env.NODE_ENV = "test";
process.env.FREA_DB_PATH = ":memory:";
process.env.COMPANY_NAME = "Test GmbH";
process.env.EMAIL = "test@example.com";
process.env.IBAN = "DE00000000000000000000";
process.env.BIC = "TESTDE00";
process.env.TAX_NUMBER = "000/000/00000";

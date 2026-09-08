import SQLite from 'react-native-sqlite-storage';
import { Prescription, ScanResult, ScheduleEntry } from '../types';

const DB_NAME = 'pillcheck.db';

type SQLiteTx = any;

class StorageService {
  private db: any = null;

  async init() {
    this.db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
    this.createTables();
  }

  private createTables() {
    if (!this.db) return;
    this.db.transaction((tx: SQLiteTx) => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS prescriptions (
          id TEXT PRIMARY KEY,
          created_at INTEGER,
          raw_text TEXT
        )
      `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS medications (
          id TEXT PRIMARY KEY,
          prescription_id TEXT,
          name TEXT,
          dose TEXT,
          shape TEXT,
          color TEXT,
          imprint TEXT,
          image_uri TEXT,
          FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
        )
      `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS schedules (
          id TEXT PRIMARY KEY,
          medication_id TEXT,
          time TEXT,
          with_food INTEGER,
          taken INTEGER,
          taken_at INTEGER,
          status TEXT,
          mismatch_details TEXT
        )
      `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS scan_results (
          id TEXT PRIMARY KEY,
          prescription_id TEXT,
          medication_id TEXT,
          schedule_id TEXT,
          timestamp INTEGER,
          match TEXT,
          confidence REAL,
          detected_shape TEXT,
          detected_color TEXT,
          detected_imprint TEXT,
          expected_shape TEXT,
          expected_color TEXT,
          expected_imprint TEXT,
          user_response TEXT
        )
      `);
    });
  }

  savePrescription(prescription: Prescription) {
    if (!this.db) return;
    this.db.transaction((tx: SQLiteTx) => {
      tx.executeSql(
        'INSERT OR REPLACE INTO prescriptions (id, created_at, raw_text) VALUES (?, ?, ?)',
        [prescription.id, prescription.createdAt, prescription.rawText || '']
      );
      prescription.medications.forEach(med => {
        tx.executeSql(
          'INSERT OR REPLACE INTO medications (id, prescription_id, name, dose, shape, color, imprint, image_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [med.id, prescription.id, med.name, med.dose, med.shape || '', med.color || '', med.imprint || '', med.imageUri || '']
        );
        med.schedule.forEach(s => {
          tx.executeSql(
            'INSERT OR REPLACE INTO schedules (id, medication_id, time, with_food, taken, taken_at, status, mismatch_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [s.id, med.id, s.time, s.withFood ? 1 : 0, s.taken ? 1 : 0, s.takenAt || 0, s.status, s.mismatchDetails || '']
          );
        });
      });
    });
  }

  async getPrescription(id: string): Promise<Prescription | null> {
    if (!this.db) return null;
    const [prescription] = await this.db.executeSql('SELECT * FROM prescriptions WHERE id = ?', [id]);
    if (prescription.rows.length === 0) return null;
    const p = prescription.rows.item(0);
    const meds = await this.getMedicationsForPrescription(id);
    return {
      id: p.id,
      createdAt: p.created_at,
      rawText: p.raw_text,
      medications: meds,
    };
  }

  async getMedicationsForPrescription(prescriptionId: string) {
    if (!this.db) return [];
    const [medResult] = await this.db.executeSql('SELECT * FROM medications WHERE prescription_id = ?', [prescriptionId]);
    const medications: any[] = [];
    for (let i = 0; i < medResult.rows.length; i++) {
      const m = medResult.rows.item(i);
      const [schedResult] = await this.db.executeSql('SELECT * FROM schedules WHERE medication_id = ?', [m.id]);
      const schedules: ScheduleEntry[] = [];
      for (let j = 0; j < schedResult.rows.length; j++) {
        const s = schedResult.rows.item(j);
        schedules.push({
          id: s.id,
          time: s.time,
          withFood: !!s.with_food,
          taken: !!s.taken,
          takenAt: s.taken_at || undefined,
          status: s.status as ScheduleEntry['status'],
          mismatchDetails: s.mismatch_details || undefined,
        });
      }
      medications.push({
        id: m.id,
        name: m.name,
        dose: m.dose,
        shape: m.shape || undefined,
        color: m.color || undefined,
        imprint: m.imprint || undefined,
        imageUri: m.image_uri || undefined,
        schedule: schedules,
      });
    }
    return medications;
  }

  async updateSchedule(schedule: ScheduleEntry) {
    if (!this.db) return;
    await this.db.executeSql(
      'UPDATE schedules SET taken = ?, taken_at = ?, status = ?, mismatch_details = ? WHERE id = ?',
      [schedule.taken ? 1 : 0, schedule.takenAt || 0, schedule.status, schedule.mismatchDetails || '', schedule.id]
    );
  }

  async saveScanResult(result: ScanResult) {
    if (!this.db) return;
    await this.db.executeSql(
      `INSERT OR REPLACE INTO scan_results 
      (id, prescription_id, medication_id, schedule_id, timestamp, match, confidence, detected_shape, detected_color, detected_imprint, expected_shape, expected_color, expected_imprint, user_response)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.id,
        result.prescriptionId,
        result.medicationId,
        result.scheduleId,
        result.timestamp,
        result.match,
        result.confidence || 0,
        result.detectedFeatures?.shape || '',
        result.detectedFeatures?.color || '',
        result.detectedFeatures?.imprint || '',
        result.expectedFeatures?.shape || '',
        result.expectedFeatures?.color || '',
        result.expectedFeatures?.imprint || '',
        result.userResponse,
      ]
    );
  }

  async getTodaysScanResults(): Promise<ScanResult[]> {
    if (!this.db) return [];
    const today = new Date().toDateString();
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const [result] = await this.db.executeSql(
      'SELECT * FROM scan_results WHERE timestamp >= ? ORDER BY timestamp DESC',
      [startOfDay]
    );
    const results: ScanResult[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const r = result.rows.item(i);
      results.push({
        id: r.id,
        prescriptionId: r.prescription_id,
        medicationId: r.medication_id,
        scheduleId: r.schedule_id,
        timestamp: r.timestamp,
        match: r.match as ScanResult['match'],
        confidence: r.confidence,
        detectedFeatures: {
          shape: r.detected_shape || undefined,
          color: r.detected_color || undefined,
          imprint: r.detected_imprint || undefined,
        },
        expectedFeatures: {
          shape: r.expected_shape || undefined,
          color: r.expected_color || undefined,
          imprint: r.expected_imprint || undefined,
        },
        userResponse: r.user_response as ScanResult['userResponse'],
      });
    }
    return results;
  }
}

export const storage = new StorageService();

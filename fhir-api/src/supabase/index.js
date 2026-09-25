'use strict';

// Integración con Supabase para envío de alertas

const logger = require('@bluehalo/node-fhir-server-core').loggers.get();

const cfg = {
    url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    tableAlerts: process.env.SUPABASE_TABLE_ALERTS || 'alerts',
    enabled: (process.env.SUPABASE_ENABLED || 'false').toLowerCase() === 'true',
    // sistema de identificador para extraer el userId de Patient.identifier
    userSystem: process.env.SUPABASE_USER_SYSTEM || 'urn:saludata:supabase-users',
};

function isEnabled() {
    return !!(cfg.enabled && cfg.url && cfg.key);
}

async function supabaseInsert(table, row) {
    const url = `${cfg.url}/rest/v1/${table}?on_conflict=id`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            apikey: cfg.key,
            Authorization: `Bearer ${cfg.key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify(row),
    });
    if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`Supabase ${table} -> ${resp.status} ${t}`);
    }
    return resp.json().catch(() => ({}));
}

function pickRecipientReference(resource) {
    const recips = Array.isArray(resource && resource.recipient) ? resource.recipient : [];
    const patient = recips.find(
        (r) => r && typeof r.reference === 'string' && r.reference.startsWith('Patient/')
    );
    if (patient && patient.reference) { return patient.reference; }
    if (recips.length && recips[0] && recips[0].reference) { return recips[0].reference; }
    if (resource && resource.subject && resource.subject.reference) { return resource.subject.reference; }
    return null;
}

function extractSupabaseUserIdFromPatient(patient) {
    if (!patient || !Array.isArray(patient.identifier)) { return null; }
    const match = patient.identifier.find(
        (id) => id && id.system === cfg.userSystem && id.value
    );
    return (match && match.value) || null;
}

function formatObservationValue(obs) {
    // Valores simples
    if (obs.valueQuantity) {
        const val = obs.valueQuantity.value;
        const unit = obs.valueQuantity.unit || obs.valueQuantity.code || '';
        return `${val} ${unit}`.trim();
    }
    if (obs.valueString) {
        return obs.valueString;
    }
    if (obs.valueBoolean !== undefined) {
        return String(obs.valueBoolean);
    }

    // Componentes (ej: presión arterial sistólica/diastólica)
    if (Array.isArray(obs.component) && obs.component.length) {
        const parts = obs.component.map(c => {
            if (c.valueQuantity) {
                return `${c.valueQuantity.value}`;
            }
            return '';
        }).filter(Boolean);
        if (parts.length) {
            const firstComponent = obs.component[0];
            const unit = (firstComponent.valueQuantity && firstComponent.valueQuantity.unit) ||
                (firstComponent.valueQuantity && firstComponent.valueQuantity.code) || '';
            return `${parts.join('/')} ${unit}`.trim();
        }
    }

    return '';
}

function buildAlertRowFromCommunicationRequest(cr, userId, observation) {
    const payloadStr =
        (Array.isArray(cr && cr.payload) &&
            cr.payload[0] &&
            cr.payload[0].contentString) || '';

    // Extraer note_text directamente del CommunicationRequest.note[].text
    // El CQF Ruler ya genera el mensaje apropiado en note.text
    let noteText = null;
    if (cr && Array.isArray(cr.note) && cr.note.length > 0) {
        // Tomar el primer note.text disponible
        const firstNote = cr.note.find(n => n && n.text);
        if (firstNote && firstNote.text) {
            noteText = firstNote.text;
        }
    }

    // Fallback: si no hay note.text en el CR, construir desde Observations (para compatibilidad)
    if (!noteText) {
        const observations = Array.isArray(observation) ? observation : (observation ? [observation] : []);
        if (observations.length > 0) {
            const noteParts = observations.map(obs => {
                if (!obs || obs.resourceType !== 'Observation') { return null; }

                const when = obs.effectiveDateTime || obs.issued || '';
                const coding = (obs.code && Array.isArray(obs.code.coding)) ? obs.code.coding[0] : null;
                const display = (coding && (coding.display || coding.code)) || 'Observation';
                const valueStr = formatObservationValue(obs);
                return `${display}${valueStr ? ': ' + valueStr : ''} at ${when}`;
            }).filter(Boolean);

            if (noteParts.length > 0) {
                noteText = `Triggered by ${noteParts.join('; ')}`;
            }
        }
    }

    return {
        id: String((cr && cr.id) || ''),
        status: 'completed', // Marca como completada al enviar a Supabase
        subject_reference: (cr && cr.subject && cr.subject.reference) || null,
        sent: new Date().toISOString(),
        recipient_reference: pickRecipientReference(cr) || 'unknown',
        payload_contentstring: payloadStr || '',
        note_text: noteText,
        user_id: userId || null,
    };
}

async function resolveSupabaseUserId({ localBase, patientRef }) {
    try {
        if (!patientRef) { return null; }
        const patientId = patientRef.replace('Patient/', '');
        const url = `${localBase}/Patient/${patientId}`;
        const resp = await fetch(url, { headers: { Accept: 'application/fhir+json' } });
        const patient = await resp.json();
        return extractSupabaseUserIdFromPatient(patient);
    } catch (e) { /* ignore errors */ } // eslint-disable-line no-unused-vars
}

async function insertAlertFromCommunicationRequest({ commRequest, observation, localBase }) {
    if (!isEnabled()) { return null; }
    if (!commRequest || !commRequest.id) {
        throw new Error('CommunicationRequest with id required');
    }

    const patientRef = pickRecipientReference(commRequest) || (commRequest.subject && commRequest.subject.reference);
    const userId = await resolveSupabaseUserId({ localBase, patientRef });
    if (!userId) {
        logger.warn('[Supabase] No user_id resolved from Patient.identifier');
    }
    const row = buildAlertRowFromCommunicationRequest(commRequest, userId, observation);
    return supabaseInsert(cfg.tableAlerts, row);
}

module.exports = {
    isEnabled,
    insertAlertFromCommunicationRequest,
};



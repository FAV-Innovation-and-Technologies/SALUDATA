'use strict';

/**
 * Convert a collection search result into the FHIR search response shape.
 */
function toSearchBundle(resources) {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: resources.length,
    entry: resources.map(resource => ({ resource })),
  };
}

module.exports = { toSearchBundle };

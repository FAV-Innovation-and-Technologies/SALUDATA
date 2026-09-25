/**
 * @swagger
 * /4_0_0/metadata:
 *   get:
 *     tags: [Server]
 *     summary: Read the server CapabilityStatement
 *     description: Use this response as the deployment-specific source of supported FHIR interactions. Swagger route listings are generated from configuration and do not prove conformance.
 *     responses:
 *       200:
 *         description: CapabilityStatement returned by the running server.
 *         content:
 *           application/fhir+json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 */

/**
 * @swagger
 * /upload-bundle:
 *   post:
 *     tags: [Legacy]
 *     summary: Upload a FHIR Bundle file
 *     description: Optional legacy endpoint. It is disabled when FHIR_LEGACY_ENDPOINTS_ENABLED=false and may require bearer authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [bundle]
 *             properties:
 *               bundle:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Bundle accepted by the configured legacy handler.
 *       400:
 *         $ref: '#/components/responses/OperationOutcome'
 *       401:
 *         description: Authentication required when configured.
 *       404:
 *         description: Legacy endpoints are disabled.
 */

# GitLab CI/CD opt-in de la ingesta Step 1

`ci/step1.gitlab-ci.yml` añade tests y una cadena de suministro aislada para el
entrypoint `src/step1-ingestion.js`. `.gitlab-ci.yml` solo incluye la plantilla
cuando `STEP1_CI_ENABLED=true`; los jobs productivos actuales conservan sus
reglas y no son extendidos ni reemplazados. Esta plantilla no contiene ninguna
operación Kubernetes ni despliegue.

## Configuración protegida

1. Crear un runner dedicado con tag `step1-multiarch-protected`, restringido a
   refs protegidas. Debe soportar Docker-in-Docker privilegiado, compartir
   `/certs/client` con DinD y no ejecutar código de refs no confiables.
2. Definir `STEP1_CI_ENABLED=true`. No es secreto y puede quedar sin proteger
   para validar merge requests hacia `develop`.
3. Definir `STEP1_PUBLISH_IMAGES=true` y `STEP1_BUILDER_TRUSTED=true` como
   variables **protegidas**. Los jobs de publicación también comprueban en
   runtime `CI_COMMIT_REF_PROTECTED=true`; cualquier ausencia falla cerrada.

El pipeline usa únicamente `CI_REGISTRY_USER` y `CI_REGISTRY_PASSWORD`,
credenciales efímeras entregadas por GitLab. No se deben añadir contraseñas,
tokens, certificados, kubeconfigs ni variables de producción.

## Flujo y entrega por digest

- `step1:verify`, ubicado en el stage reservado `.pre` para no modificar los
  stages productivos `build/deploy`, regenera en un directorio aislado
  `package-lock.step1.json`
  desde `package.step1.json` y exige comparación byte a byte; `package-lock.json` queda
  reservado a las dependencias de test y también debe permanecer sin cambios.
  Ejecuta sintaxis Node, ESLint dirigido a la frontera Step 1 y toda la suite
  Jest. También valida que la base del Dockerfile esté fijada por digest, que el
  runtime use `npm ci --omit=dev --ignore-scripts` con parche explícito y que el
  contexto excluya entornos, claves y certificados.
- `step1:build-image` instala binfmt desde una imagen fijada literalmente por
  digest, exige soporte real `linux/amd64,linux/arm64` y publica un único tag de
  transporte `step1-$CI_PIPELINE_ID-$CI_JOB_ID`. BuildKit adjunta provenance y
  SBOM; el artifact dotenv
  entrega `STEP1_FHIR_IMAGE=registry/repo@sha256:...`. Cualquier consumidor debe
  usar el digest, nunca el tag.
- `step1:image-scan` genera SBOM CycloneDX y escanea ambas arquitecturas con
  Trivy. HIGH o CRITICAL, incluso sin corrección disponible, hacen fallar el
  pipeline. Los informes JSON y GitLab se conservan aun cuando el job falle.

El valor `STEP1_FHIR_IMAGE` es el handoff hacia el pipeline opt-in de
`biosignal-anomaly-engine`, que combina este digest con el suyo y produce el
YAML Kubernetes final como artifact. Ninguna de las dos plantillas lo aplica.

No hay `allow_failure`, fallback a HTTP, tags `latest`, imágenes de herramientas
sin digest ni secretos embebidos. Si el registro, binfmt, el runner protegido o
la base de vulnerabilidades no están disponibles, el pipeline se detiene.

export default {
  spec_dir: "src",
  spec_files: [
    "**/*[sS]pec.ts"
  ],
  helpers: [
    "helpers/**/*.ts"
  ],
  env: {
    stopSpecOnExpectationFailure: false,
    random: false,
    forbidDuplicateNames: true
  },
  requires: [
    "ts-node/register"
  ]
}
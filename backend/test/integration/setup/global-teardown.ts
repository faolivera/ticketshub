export default async function globalTeardown(): Promise<void> {
  console.log('\n🧹 Integration Test Global Teardown\n');
  console.log('  Cleanup complete.\n');
}

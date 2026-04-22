// Test script to verify wallpaper search functionality
import { searchWallpapers, getPicsumWallpapers } from './src/lib/wallpaper-search.ts';

async function testWallpaperSearch() {
  console.log('🧪 Testing Wallpaper Search Functionality\n');

  // Test 1: Empty query
  console.log('Test 1: Empty query');
  try {
    const emptyResults = await searchWallpapers('');
    console.log('✅ Empty query returned', emptyResults.length, 'images');
  } catch (error) {
    console.log('❌ Empty query failed:', error.message);
  }

  // Test 2: Search for "paris"
  console.log('\nTest 2: Search for "paris"');
  try {
    const parisResults = await searchWallpapers('paris');
    console.log('✅ Paris search returned', parisResults.length, 'images');
    console.log('Sample URLs:', parisResults.slice(0, 3));
  } catch (error) {
    console.log('❌ Paris search failed:', error.message);
  }

  // Test 3: Search for "beach"
  console.log('\nTest 3: Search for "beach"');
  try {
    const beachResults = await searchWallpapers('beach');
    console.log('✅ Beach search returned', beachResults.length, 'images');
    console.log('Sample URLs:', beachResults.slice(0, 3));
  } catch (error) {
    console.log('❌ Beach search failed:', error.message);
  }

  // Test 4: Check if different queries return different results
  console.log('\nTest 4: Comparing different queries');
  try {
    const paris1 = await searchWallpapers('paris');
    const paris2 = await searchWallpapers('paris');
    const beach = await searchWallpapers('beach');

    const parisConsistent = paris1.length === paris2.length && paris1[0] === paris2[0];
    console.log('✅ Paris results are consistent:', parisConsistent);

    const differentResults = paris1[0] !== beach[0];
    console.log('✅ Different queries return different results:', differentResults);
  } catch (error) {
    console.log('❌ Comparison test failed:', error.message);
  }

  console.log('\n🎉 Wallpaper search testing complete!');
}

// Run the test
testWallpaperSearch().catch(console.error);
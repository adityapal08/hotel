import { NextResponse } from 'next/server';
import { PROPERTIES_CONFIG, getAllProperties, getProperty } from '@/lib/db';

/**
 * GET /api/properties
 * Returns all properties or a single property by slug or id.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') || searchParams.get('id');

    if (slug) {
      const property = getProperty(slug);
      if (!property) {
        return NextResponse.json(
          { success: false, error: 'Property not found.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, property });
    }

    const properties = getAllProperties();
    return NextResponse.json({
      success: true,
      properties,
    });
  } catch (error) {
    console.error('Error in GET /api/properties:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve properties.' },
      { status: 500 }
    );
  }
}

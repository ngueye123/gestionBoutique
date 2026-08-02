<?php

namespace Tests\Unit;

use App\Models\Product;
use Tests\TestCase;

class ProductTest extends TestCase
{
    public function test_it_persists_selected_unit_type_and_reference(): void
    {
        $product = Product::create([
            'reference' => 'TEST-UNIT-001',
            'name' => 'Produit test',
            'price' => 1000,
            'stock' => 10,
            'category' => 'Test',
            'min_stock' => 2,
            'utilisateur_id' => 1,
            'unit_type' => 'masse',
            'unit_reference' => 'kg',
        ]);

        $this->assertSame('masse', $product->unit_type);
        $this->assertSame('kg', $product->unit_reference);

        $fresh = $product->fresh();
        $this->assertSame('masse', $fresh->unit_type);
        $this->assertSame('kg', $fresh->unit_reference);
    }
}

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

    public function test_it_generates_reference_from_name_when_missing(): void
    {
        $product = Product::create([
            'name' => 'Farine de blé',
            'price' => 1000,
            'stock' => 10,
            'category' => 'Alimentaire',
            'min_stock' => 2,
            'utilisateur_id' => 1,
            'unit_type' => 'piece',
            'unit_reference' => 'piece',
        ]);

        $this->assertNotEmpty($product->reference);
        $this->assertStringContainsString('FARINE-DE-BLE', $product->reference);
        $this->assertMatchesRegularExpression('/^FARINE-DE-BLE-\d{4}$/', $product->reference);
    }
}

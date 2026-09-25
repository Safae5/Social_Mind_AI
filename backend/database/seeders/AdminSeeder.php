<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@socialmindai.com'],
            [
                'first_name'        => 'Admin',
                'last_name'         => 'Social Mind',
                'email'             => 'admin@socialmindai.com',
                'password'          => Hash::make('Admin@123456'),
                'role'              => 'admin',
                'status'            => 'active',
                'email_verified_at' => now(),
                'current_plan'      => 'business_premium',
            ]
        );

        $this->command->info('✅ Admin créé : admin@socialmindai.com / Admin@123456');
    }
}
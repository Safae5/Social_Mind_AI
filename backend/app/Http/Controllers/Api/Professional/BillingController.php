<?php

namespace App\Http\Controllers\Api\Professional;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\InvoicesforClient as Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    // ══════════════════════════════════════════════════════════
    // GET /api/professional/invoices
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user  = $request->user();
        $query = Invoice::where('user_id', $user->id)
            ->with('client:id,name,company_name,avatar')
            ->orderByDesc('created_at');

        if ($request->filled('status')) $query->where('status', $request->status);
        if ($request->filled('client_id')) $query->where('client_id', $request->client_id);

        $invoices = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => [
                'invoices' => $invoices,
                'stats'    => [
                    'total_paid'    => Invoice::where('user_id', $user->id)->where('status', 'paid')->sum('total'),
                    'total_pending' => Invoice::where('user_id', $user->id)->where('status', 'sent')->sum('total'),
                    'overdue_count' => Invoice::where('user_id', $user->id)->where('status', 'sent')->where('due_date', '<', now())->count(),
                ],
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/invoices
    // ══════════════════════════════════════════════════════════

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'client_id'  => 'required|integer|exists:clients,id',
            'line_items' => 'required|array|min:1',
            'line_items.*.description' => 'required|string',
            'line_items.*.quantity'    => 'required|numeric|min:0.01',
            'line_items.*.unit_price'  => 'required|numeric|min:0',
            'tax_rate'   => 'nullable|numeric|min:0|max:100',
            'issue_date' => 'required|date',
            'due_date'   => 'required|date|after:issue_date',
            'notes'      => 'nullable|string',
            'currency'   => 'nullable|string|size:3',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        // Vérifie que le client appartient au professionnel
        Client::where('user_id', $user->id)->findOrFail($request->client_id);

        // Calcul des montants
        $subtotal = array_sum(array_map(
            fn($item) => $item['quantity'] * $item['unit_price'],
            $request->line_items
        ));
        $taxRate   = $request->tax_rate ?? 0;
        $taxAmount = $subtotal * $taxRate / 100;
        $total     = $subtotal + $taxAmount;

        $invoice = Invoice::create([
            'user_id'    => $user->id,
            'client_id'  => $request->client_id,
            'line_items' => $request->line_items,
            'subtotal'   => $subtotal,
            'tax_rate'   => $taxRate,
            'tax_amount' => $taxAmount,
            'total'      => $total,
            'currency'   => $request->currency ?? 'EUR',
            'status'     => 'draft',
            'issue_date' => $request->issue_date,
            'due_date'   => $request->due_date,
            'notes'      => $request->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => '✅ Facture créée.',
            'data'    => ['invoice' => $invoice->load('client:id,name,company_name')],
        ], 201);
    }

    // ══════════════════════════════════════════════════════════
    // PUT /api/professional/invoices/{id}/status
    // ══════════════════════════════════════════════════════════

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:draft,sent,paid,overdue,cancelled',
        ]);

        /** @var \App\Models\User $user */
        $user    = $request->user();
        $invoice = Invoice::where('user_id', $user->id)->findOrFail($id);

        $updateData = ['status' => $request->status];
        if ($request->status === 'paid') {
            $updateData['paid_date'] = now()->toDateString();
        }

        $invoice->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Statut mis à jour.',
            'data'    => ['invoice' => $invoice->fresh()],
        ]);
    }
}
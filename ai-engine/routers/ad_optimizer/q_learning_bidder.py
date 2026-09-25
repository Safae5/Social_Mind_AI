### `routers/ad_optimizer/q_learning_bidder.py`


# routers/ad_optimizer/q_learning_bidder.py
"""
Stratégie d'enchères adaptative avec Q-Learning.

Q-Learning : algorithme d'apprentissage par renforcement.
  - L'agent observe l'ÉTAT actuel de la campagne
  - Il choisit une ACTION (ajuster l'enchère)
  - Il reçoit une RÉCOMPENSE (basée sur ROAS obtenu)
  - Il met à jour la Q-table : Q(s,a) ← Q(s,a) + α[r + γ×max Q(s',a') - Q(s,a)]

ÉTAT (24 états = 3 × 4 × 2) :
  - performance_level : [faible, moyen, fort] (0, 1, 2)
  - budget_remaining  : [épuisé, faible, suffisant, élevé] (0-3)
  - day_type          : [semaine=0, weekend=1]

ACTIONS (4) :
  0 : Réduire -20% (campagne sous-performe)
  1 : Maintenir    (état normal)
  2 : Augmenter +10% (bonne performance)
  3 : Augmenter +25% (excellent ROAS)

RÉCOMPENSE :
  ROAS >= 4 → +10 | ROAS 3-4 → +6 | ROAS 1.5-3 → +2 | ROAS < 1 → -5
  + bonus CTR et conversions
"""

import numpy as np   # type: ignore
import pandas as pd   # type: ignore

N_PERFORMANCE_LEVELS = 3
N_BUDGET_LEVELS      = 4
N_DAY_TYPES          = 2
N_STATES             = N_PERFORMANCE_LEVELS * N_BUDGET_LEVELS * N_DAY_TYPES  # 24

ACTIONS = {
    0: {"label": "Réduire -20%",    "multiplier": 0.80},
    1: {"label": "Maintenir",       "multiplier": 1.00},
    2: {"label": "Augmenter +10%",  "multiplier": 1.10},
    3: {"label": "Augmenter +25%",  "multiplier": 1.25},
}
N_ACTIONS = 4


def encode_state(performance_score: float, budget_remaining_pct: float, is_weekend: bool) -> int:
    """Encode les métriques de campagne en état discret (0-23)."""
    perf_level = 0 if performance_score < 33 else 1 if performance_score < 66 else 2
    budget_lvl = (0 if budget_remaining_pct < 10 else
                  1 if budget_remaining_pct < 30 else
                  2 if budget_remaining_pct < 70 else 3)
    day_type   = 1 if is_weekend else 0
    state      = perf_level * (N_BUDGET_LEVELS * N_DAY_TYPES) + budget_lvl * N_DAY_TYPES + day_type
    return min(state, N_STATES - 1)


def compute_reward(roas: float, ctr: float, conversions: int) -> float:
    """Calcule la récompense Q-Learning."""
    base = (10 if roas >= 4 else 6 if roas >= 3 else 2 if roas >= 1.5 else 0 if roas >= 1 else -5)
    return base + (2 if ctr >= 2 else 1 if ctr >= 1 else -1) + min(3, int(conversions) // 5)


def train_q_learning(df: pd.DataFrame, episodes: int = 500,
                      alpha: float = 0.1, gamma: float = 0.95,
                      epsilon: float = 0.3) -> dict:
    """
    Entraîne l'agent Q-Learning sur les données historiques.

    α=0.1 : taux d'apprentissage conservateur
    γ=0.95 : valorise fortement les récompenses futures
    ε=0.3 : 30% exploration → décroît progressivement

    Équation de Bellman :
    Q(s,a) ← Q(s,a) + α × [r + γ × max_a' Q(s',a') - Q(s,a)]
    """
    print(f"🎮 Entraînement Q-Learning ({episodes} épisodes)...")
    Q_table = np.zeros((N_STATES, N_ACTIONS))

    transitions = []
    for i in range(len(df) - 1):
        row_curr = df.iloc[i]
        row_next = df.iloc[i + 1]
        is_wk    = pd.to_datetime(row_curr["date"]).dayofweek >= 5
        state    = encode_state(row_curr.get("performance_score", 50), 50, is_wk)
        reward   = compute_reward(
            row_curr.get("roas", 0), row_curr.get("ctr", 0), int(row_curr.get("conversions", 0))
        )
        is_wk_next  = pd.to_datetime(row_next["date"]).dayofweek >= 5
        next_state  = encode_state(row_next.get("performance_score", 50), 50, is_wk_next)
        transitions.append((state, reward, next_state))

    rewards_history = []
    eps_decay       = epsilon / max(episodes, 1)

    for episode in range(episodes):
        if not transitions:
            break
        idx   = np.random.randint(len(transitions))
        state, reward, next_state = transitions[idx]

        # ε-greedy
        if np.random.random() < (epsilon - episode * eps_decay):
            action = np.random.randint(N_ACTIONS)
        else:
            action = int(np.argmax(Q_table[state]))

        # Mise à jour Q (Bellman)
        current_q  = Q_table[state, action]
        max_next_q = np.max(Q_table[next_state])
        Q_table[state, action] = current_q + alpha * (reward + gamma * max_next_q - current_q)
        rewards_history.append(reward)

    avg_reward = float(np.mean(rewards_history[-100:])) if len(rewards_history) >= 100 else float(np.mean(rewards_history))
    print(f"   ✅ Q-Learning — Récompense moy. (100 derniers) : {avg_reward:.2f}")

    return {
        "Q_table"        : Q_table,
        "rewards_history": rewards_history,
        "avg_reward"     : round(avg_reward, 2),
        "n_episodes"     : episodes,
        "alpha"          : alpha,
        "gamma"          : gamma,
    }


def get_bid_recommendation(q_result: dict, performance_score: float,
                             budget_remaining_pct: float, is_weekend: bool,
                             current_bid: float) -> dict:
    """Recommande un ajustement d'enchère basé sur la Q-table."""
    Q_table     = q_result["Q_table"]
    state       = encode_state(performance_score, budget_remaining_pct, is_weekend)
    action      = int(np.argmax(Q_table[state]))
    action_info = ACTIONS[action]
    new_bid     = round(current_bid * action_info["multiplier"], 3)
    q_values    = Q_table[state]

    return {
        "recommended_action": action_info["label"],
        "current_bid"       : current_bid,
        "recommended_bid"   : new_bid,
        "bid_change_pct"    : round((action_info["multiplier"] - 1) * 100, 1),
        "state_id"          : state,
        "q_values"          : {ACTIONS[i]["label"]: round(float(v), 3) for i, v in enumerate(q_values)},
        "confidence"        : round(float(max(q_values) - min(q_values)), 3),
    }
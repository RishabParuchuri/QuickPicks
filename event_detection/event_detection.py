import pandas as pd


def is_next_play_interesting(df: pd.DataFrame) -> bool:
    """
    Rule-based function to decide if the NEXT play is 'interesting'
    given the last play context in the dataframe.
    """

    if df.empty:
        return False

    # Look at the most recent play
    last_play = df.iloc[-1]

    quarter = last_play["Quarter"]
    drive_number = last_play["DriveNumber"]
    play_num = last_play["PlayNumberInDrive"]
    play_outcome = str(last_play["PlayOutcome"]).lower()
    play_desc = str(last_play["PlayDescription"]).lower()
    play_start = last_play["PlayStart"]

    # --- Score info ---
    # Assumes df has running score columns: HomeScore, AwayScore
    home_score = last_play.get("HomeScore", None)
    away_score = last_play.get("AwayScore", None)

    score_diff = None
    if home_score is not None and away_score is not None:
        if last_play["TeamWithPossession"] == last_play["HomeTeam"]:
            score_diff = home_score - away_score
        else:
            score_diff = away_score - home_score

    # --- Derived context ---
    distance_to_endzone = 100 - play_start
    in_red_zone = distance_to_endzone <= 20
    critical_down = play_num in [3, 4]
    late_game = quarter == 4
    close_game = score_diff is not None and abs(score_diff) <= 7  # one-score game

    # --- Rules for "interesting" ---
    # 1. Red zone plays
    if in_red_zone:
        return True

    # 2. Late-game critical downs in a close game
    if late_game and close_game and critical_down:
        return True

    # 3. Scoring opportunities
    if any(
        x in play_desc for x in ["field goal", "extra point", "2-point", "touchdown"]
    ):
        return True

    # 4. Turnover potential
    if any(x in play_desc for x in ["intercepted", "fumble", "challenged", "review"]):
        return True

    # 5. Long yardage / momentum-shifting plays
    if any(x in play_desc for x in ["deep pass", "punt", "kickoff"]):
        return True

    # Otherwise, not interesting
    return False

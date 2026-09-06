with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "Внешний вид может незначительно отличаться в турнирной сетке. (Загрузка кастомного фона доступна внутри турнира)" in line:
        # It's at index i.
        # The next few lines are:
        #                  </div>
        #               </div></div>
        #             </div>
        break

# I'll just restore the end of the file completely since I know how it should end.

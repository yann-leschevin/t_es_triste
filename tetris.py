import random
import sys
import pygame


# =========================
# Configuration
# =========================

COLS = 10
ROWS = 20
CELL = 32

BOARD_X = 30
BOARD_Y = 30

SIDE_X = BOARD_X + COLS * CELL + 35
WIDTH = SIDE_X + 210
HEIGHT = BOARD_Y + ROWS * CELL + 30

FPS = 60

BACKGROUND = (18, 21, 31)
BOARD_COLOR = (10, 12, 18)
GRID_COLOR = (42, 46, 60)
WHITE = (235, 238, 245)
GRAY = (145, 151, 165)
GHOST_COLOR = (80, 85, 105)

COLORS = {
    "I": (40, 210, 230),
    "O": (245, 210, 50),
    "T": (170, 75, 220),
    "S": (80, 205, 100),
    "Z": (225, 70, 75),
    "J": (65, 110, 220),
    "L": (235, 140, 50),
}

SHAPES = {
    "I": [
        ["....", "IIII", "....", "...."],
        ["..I.", "..I.", "..I.", "..I."],
        ["....", "IIII", "....", "...."],
        [".I..", ".I..", ".I..", ".I.."],
    ],
    "O": [
        [".OO.", ".OO.", "....", "...."],
        [".OO.", ".OO.", "....", "...."],
        [".OO.", ".OO.", "....", "...."],
        [".OO.", ".OO.", "....", "...."],
    ],
    "T": [
        [".T..", "TTT.", "....", "...."],
        [".T..", ".TT.", ".T..", "...."],
        ["....", "TTT.", ".T..", "...."],
        [".T..", "TT..", ".T..", "...."],
    ],
    "S": [
        [".SS.", "SS..", "....", "...."],
        [".S..", ".SS.", "..S.", "...."],
        [".SS.", "SS..", "....", "...."],
        [".S..", ".SS.", "..S.", "...."],
    ],
    "Z": [
        ["ZZ..", ".ZZ.", "....", "...."],
        ["..Z.", ".ZZ.", ".Z..", "...."],
        ["ZZ..", ".ZZ.", "....", "...."],
        ["..Z.", ".ZZ.", ".Z..", "...."],
    ],
    "J": [
        ["J...", "JJJ.", "....", "...."],
        [".JJ.", ".J..", ".J..", "...."],
        ["....", "JJJ.", "..J.", "...."],
        [".J..", ".J..", "JJ..", "...."],
    ],
    "L": [
        ["..L.", "LLL.", "....", "...."],
        [".L..", ".L..", ".LL.", "...."],
        ["....", "LLL.", "L...", "...."],
        ["LL..", ".L..", ".L..", "...."],
    ],
}


class Piece:
    def __init__(self, kind):
        self.kind = kind
        self.rotation = 0
        self.x = 3
        self.y = -1

    def cells(self):
        shape = SHAPES[self.kind][self.rotation]
        result = []

        for row, line in enumerate(shape):
            for col, value in enumerate(line):
                if value != ".":
                    result.append((self.x + col, self.y + row))

        return result


class Tetris:
    def __init__(self):
        self.reset()

    def reset(self):
        self.board = [[None for _ in range(COLS)] for _ in range(ROWS)]
        self.bag = []
        self.current = self.new_piece()
        self.next_piece = self.new_piece()
        self.hold_piece = None
        self.can_hold = True

        self.score = 0
        self.lines = 0
        self.level = 1

        self.last_was_rotation = False

        self.fall_timer = 0
        self.lock_timer = 0
        self.game_over = False
        self.paused = False

    def refill_bag(self):
        self.bag = list(SHAPES.keys())
        random.shuffle(self.bag)

    def new_piece(self):
        if not self.bag:
            self.refill_bag()

        return Piece(self.bag.pop())

    def cells(self, piece=None):
        if piece is None:
            piece = self.current

        return piece.cells()

    def valid(self, piece=None):
        """
        Vérifie si une pièce est dans une position valide.
        Correction importante : piece est maintenant optionnel.
        """
        if piece is None:
            piece = self.current

        for x, y in self.cells(piece):
            if x < 0 or x >= COLS:
                return False

            if y >= ROWS:
                return False

            if y >= 0 and self.board[y][x] is not None:
                return False

        return True

    def move(self, dx, dy):
        self.current.x += dx
        self.current.y += dy

        if not self.valid():
            self.current.x -= dx
            self.current.y -= dy
            return False

        if dx != 0:
            self.last_was_rotation = False

        return True

    def rotate(self):
        old_rotation = self.current.rotation
        old_x = self.current.x

        self.current.rotation = (self.current.rotation + 1) % 4

        # Petits décalages latéraux pour faciliter les rotations.
        kicks = [0, -1, 1, -2, 2]

        for offset in kicks:
            self.current.x = old_x + offset

            if self.valid():
                self.last_was_rotation = True
                return True

        self.current.rotation = old_rotation
        self.current.x = old_x
        return False

    def ghost_y(self):
        original_y = self.current.y
        distance = 0

        while True:
            self.current.y += 1

            if not self.valid():
                self.current.y = original_y
                return original_y + distance

            distance += 1

    def hard_drop(self):
        distance = 0

        while self.move(0, 1):
            distance += 1

        self.last_was_rotation = False
        self.score += distance * 2
        self.lock_piece()

    def tspin(self):
        """
        Détecte un T-spin : pièce T déposée par une rotation avec au moins
        3 des 4 coins diagonaux occupés (murs et plancher inclus).
        """
        if self.current.kind != "T" or not self.last_was_rotation:
            return False

        cells = self.current.cells()
        min_x = max_x = cells[0][0]
        min_y = max_y = cells[0][1]

        for x, y in cells[1:]:
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)

        corners = [
            (min_x - 1, min_y - 1),
            (max_x + 1, min_y - 1),
            (min_x - 1, max_y + 1),
            (max_x + 1, max_y + 1),
        ]

        occupied = 0

        for x, y in corners:
            if x < 0 or x >= COLS or y >= ROWS:
                occupied += 1
            elif y >= 0 and self.board[y][x] is not None:
                occupied += 1

        return occupied >= 3

    def lock_piece(self):
        for x, y in self.cells():
            if y < 0:
                self.game_over = True
                return

            self.board[y][x] = self.current.kind

        is_tspin = self.tspin()
        cleared = self.clear_lines()

        if cleared == 1:
            self.score += 100 * self.level
        elif cleared == 2:
            self.score += 300 * self.level
        elif cleared == 3:
            self.score += 500 * self.level
        elif cleared == 4:
            self.score += 800 * self.level

        # Un T-spin vaut 2 fois les points d'un tetris (2 x 800 x niveau).
        if is_tspin:
            self.score += 1600 * self.level

        self.lines += cleared
        self.level = self.lines // 10 + 1
        self.last_was_rotation = False

        self.current = self.next_piece
        self.current.x = 3
        self.current.y = -1
        self.current.rotation = 0

        self.next_piece = self.new_piece()
        self.can_hold = True
        self.lock_timer = 0

        if not self.valid():
            self.game_over = True

    def clear_lines(self):
        remaining = [
            row for row in self.board
            if any(cell is None for cell in row)
        ]

        cleared = ROWS - len(remaining)

        while len(remaining) < ROWS:
            remaining.insert(0, [None for _ in range(COLS)])

        self.board = remaining
        return cleared

    def hold(self):
        if not self.can_hold:
            return

        current_kind = self.current.kind

        if self.hold_piece is None:
            self.hold_piece = current_kind
            self.current = self.next_piece
            self.next_piece = self.new_piece()
        else:
            self.hold_piece, current_kind = current_kind, self.hold_piece
            self.current = Piece(current_kind)

        self.current.x = 3
        self.current.y = -1
        self.current.rotation = 0
        self.can_hold = False

        if not self.valid():
            self.game_over = True

    def update(self, dt):
        if self.paused or self.game_over:
            return

        fall_speed = max(80, 700 - (self.level - 1) * 55)
        self.fall_timer += dt

        if self.fall_timer >= fall_speed:
            self.fall_timer = 0

            if not self.move(0, 1):
                self.lock_timer += dt

                if self.lock_timer >= 450:
                    self.lock_piece()
            else:
                self.lock_timer = 0


def draw_block(screen, x, y, color, size=CELL):
    rect = pygame.Rect(x, y, size, size)

    pygame.draw.rect(screen, color, rect, border_radius=4)
    pygame.draw.rect(
        screen,
        tuple(min(255, c + 35) for c in color),
        rect,
        width=2,
        border_radius=4,
    )


def draw_board(screen, game):
    board_rect = pygame.Rect(
        BOARD_X,
        BOARD_Y,
        COLS * CELL,
        ROWS * CELL,
    )

    pygame.draw.rect(screen, BOARD_COLOR, board_rect)

    for y in range(ROWS):
        for x in range(COLS):
            rect = pygame.Rect(
                BOARD_X + x * CELL,
                BOARD_Y + y * CELL,
                CELL,
                CELL,
            )

            pygame.draw.rect(screen, GRID_COLOR, rect, width=1)

            kind = game.board[y][x]

            if kind is not None:
                draw_block(
                    screen,
                    BOARD_X + x * CELL,
                    BOARD_Y + y * CELL,
                    COLORS[kind],
                )

    if not game.game_over:
        ghost_y = game.ghost_y()

        for x, y in game.current.cells():
            ghost_y_position = ghost_y + (y - game.current.y)

            if ghost_y_position >= 0:
                rect = pygame.Rect(
                    BOARD_X + x * CELL + 4,
                    BOARD_Y + ghost_y_position * CELL + 4,
                    CELL - 8,
                    CELL - 8,
                )

                pygame.draw.rect(
                    screen,
                    GHOST_COLOR,
                    rect,
                    width=2,
                    border_radius=4,
                )

        for x, y in game.current.cells():
            if y >= 0:
                draw_block(
                    screen,
                    BOARD_X + x * CELL,
                    BOARD_Y + y * CELL,
                    COLORS[game.current.kind],
                )

    pygame.draw.rect(screen, WHITE, board_rect, width=2)


def draw_mini_piece(screen, kind, x, y, size=24):
    shape = SHAPES[kind][0]

    for row, line in enumerate(shape):
        for col, value in enumerate(line):
            if value != ".":
                draw_block(
                    screen,
                    x + col * size,
                    y + row * size,
                    COLORS[kind],
                    size,
                )


def draw_text(screen, font, text, x, y, color=WHITE):
    surface = font.render(text, True, color)
    screen.blit(surface, (x, y))


def draw_ui(screen, game, font, small_font):
    x = SIDE_X

    draw_text(screen, font, "TETRIS", x, 35)

    draw_text(screen, small_font, "SCORE", x, 100, GRAY)
    draw_text(screen, font, str(game.score), x, 122)

    draw_text(screen, small_font, "LIGNES", x, 180, GRAY)
    draw_text(screen, font, str(game.lines), x, 202)

    draw_text(screen, small_font, "NIVEAU", x, 260, GRAY)
    draw_text(screen, font, str(game.level), x, 282)

    draw_text(screen, small_font, "SUIVANTE", x, 355, GRAY)
    draw_mini_piece(screen, game.next_piece.kind, x, 390)

    draw_text(screen, small_font, "RÉSERVE", x, 500, GRAY)

    if game.hold_piece is not None:
        draw_mini_piece(screen, game.hold_piece, x, 535)

    draw_text(screen, small_font, "COMMANDES", x, 650, GRAY)
    draw_text(screen, small_font, "← → déplacer", x, 680)
    draw_text(screen, small_font, "↑ tourner", x, 705)
    draw_text(screen, small_font, "↓ accélérer", x, 730)
    draw_text(screen, small_font, "ESPACE chute", x, 755)
    draw_text(screen, small_font, "C réserve", x, 780)
    draw_text(screen, small_font, "Échap pause", x, 805)

    if game.paused:
        draw_text(screen, font, "PAUSE", BOARD_X + 92, 320, WHITE)

    if game.game_over:
        overlay = pygame.Surface(
            (COLS * CELL, ROWS * CELL),
            pygame.SRCALPHA,
        )
        overlay.fill((0, 0, 0, 170))
        screen.blit(overlay, (BOARD_X, BOARD_Y))

        draw_text(
            screen,
            font,
            "PERDU",
            BOARD_X + 105,
            BOARD_Y + 250,
            WHITE,
        )

        draw_text(
            screen,
            small_font,
            "Appuie sur R",
            BOARD_X + 90,
            BOARD_Y + 300,
            WHITE,
        )


def main():
    pygame.init()

    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Tetris Python")

    clock = pygame.time.Clock()

    font = pygame.font.SysFont("DejaVu Sans", 28, bold=True)
    small_font = pygame.font.SysFont("DejaVu Sans", 17)

    game = Tetris()

    running = True

    while running:
        dt = clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    game.paused = not game.paused

                elif event.key == pygame.K_r:
                    game.reset()

                elif not game.paused and not game.game_over:
                    if event.key == pygame.K_LEFT:
                        game.move(-1, 0)

                    elif event.key == pygame.K_RIGHT:
                        game.move(1, 0)

                    elif event.key == pygame.K_DOWN:
                        if game.move(0, 1):
                            game.score += 1

                    elif event.key == pygame.K_UP:
                        game.rotate()

                    elif event.key == pygame.K_SPACE:
                        game.hard_drop()

                    elif event.key == pygame.K_c:
                        game.hold()

        keys = pygame.key.get_pressed()

        if not game.paused and not game.game_over:
            game.update(dt)

            if keys[pygame.K_LEFT]:
                game.move(-1, 0)

            elif keys[pygame.K_RIGHT]:
                game.move(1, 0)

        screen.fill(BACKGROUND)

        draw_board(screen, game)
        draw_ui(screen, game, font, small_font)

        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()

#include <fenv.h>
#include <math.h>
#include <string.h>

typedef struct { float f1, f2; } float2;

float2 decompose(double d) {
    float2 res;
    memcpy(&res, &d, sizeof(double));
    return res;
}

double recompose(float2 fs) {
    double res;
    memcpy(&res, &fs, sizeof(double));
    return res;
}

float nonneg(float f) { return f >= 0 ? 1. : 0.; }

float2 double_get_exp(float f) {
    fesetround(FE_TONEAREST);
    f *= 2;

    float e10 = nonneg(f - 4);
    f /= 1 + e10 * 18446744073709551615.0;
    f /= 1 + e10 * 18446744073709551615.0;

    float e9 = nonneg(f - 2.16840434497e-19);
    f /= 1 + e9 * 18446744073709551615.0;

    float e8 = nonneg(f - 5.04870979341e-29);
    f /= 1 + e8 * 4294967295.0;

    float e7 = nonneg(f - 7.70371977755e-34);
    f /= 1 + e7 * 65535.0;

    float e6 = nonneg(f - 3.00926553811e-36);
    f /= 1 + e6 * 255.0;

    float e5 = nonneg(f - 1.88079096132e-37);
    f /= 1 + e5 * 15.0;

    float e4 = nonneg(f - 4.70197740329e-38);
    f /= 1 + e4 * 3.0;

    float e3 = nonneg(f - 2.35098870164e-38);
    f /= 1 + e3 * 1.0;

    float e2 = nonneg(f - 1.7632415262334313e-38);
    f -= 5.877471754134313e-39 * e2;

    float e1 = nonneg(f - 1.4693679385278594e-38);
    f -= 2.938735877078594e-39 * e1;

    float e0 = nonneg(f - 1.3224311446750734e-38);
    f -= 1.4693679385507345e-39 * e0;

    float exp = 1024 * e10 + 512 * e9 + 256 * e8 + 128 * e7 + 64 * e6 + 32 * e5 + 16 * e4 + 8 * e3 + 4 * e2 + 2 * e1 + e0;
    return (float2) { .f1 = exp, .f2 = f };
}

typedef struct { float m0_10, m11_21, m22_32, m33_43, m44_52; } double_mantissa;

typedef struct { float lo, hi; } m_res;

m_res m_add(float a, float b, float carry) {
    fesetround(FE_TONEAREST);
    float subnormal_res = a + b + carry - 3.5264830524668625e-38;

    fesetround(FE_DOWNWARD);
    float shifted_12 = (subnormal_res / 4096) * 4096;
    float lo = subnormal_res - shifted_12 + 1.1754943508222875e-38;
    float hi = shifted_12 / 2048 + 1.1754943508222875e-38;

    return (m_res) { .lo=lo, .hi=hi };
}

m_res m_mul(float a, float b) {
    float subnormal_res = 4.930380657631324e-32 + (18889465931478580854784.*a) * (18889465931478580854784.*b) - 4194304 * (a + b);
    float shifted_11 = (subnormal_res / 4096) * 4096;
    float lo = (subnormal_res - shifted_11) + 1.1754943508222875e-38;
    float hi = shifted_11 / 2048 + 1.1754943508222875e-38;
    return (m_res) { .lo=lo, .hi=hi };
}

double_mantissa double_get_mantissa(float2 d) {
    fesetround(FE_DOWNWARD);

    float b31 = 1 - nonneg(d.f1);
    d.f1 *= 1 - 2 * b31;
    fesetround(FE_TONEAREST);
    float was_sub = 0.;
    if (d.f1 < 1.17549435082e-38) {
        was_sub = 1.;
        d.f1 += 1.17549435082e-38;
    } else {
        d.f1 *= 2;
    }
    fesetround(FE_DOWNWARD);

    float b30 = nonneg(d.f1 - 4);
    d.f1 /= 1 + b30 * 18446744073709551615.0;
    d.f1 /= 1 + b30 * 18446744073709551615.0;

    float b29 = nonneg(d.f1 - 2.16840434497e-19);
    d.f1 /= 1 + b29 * 18446744073709551615.0;

    float b28 = nonneg(d.f1 - 5.04870979341e-29);
    d.f1 /= 1 + b28 * 4294967295.0;

    float b27 = nonneg(d.f1 - 7.70371977755e-34);
    d.f1 /= 1 + b27 * 65535.0;

    float b26 = nonneg(d.f1 - 3.00926553811e-36);
    d.f1 /= 1 + b26 * 255.0;

    float b25 = nonneg(d.f1 - 1.88079096132e-37);
    d.f1 /= 1 + b25 * 15.0;

    float b24 = nonneg(d.f1 - 4.70197740329e-38);
    d.f1 /= 1 + b24 * 3.0;

    float b23_raw = nonneg(d.f1 - 2.35098870164e-38);
    d.f1 /= 1 + b23_raw * 1.0;
    float b23 = b23_raw * (1-was_sub);

    float subnormal_f1 = -(1.1754943508222875e-38 - d.f1);
    fesetround(FE_DOWNWARD);
    float shifted_11 = (subnormal_f1 / 2048) * 2048;
    float shifted_22 = (subnormal_f1 / 4194304) * 4194304;
    fesetround(FE_TONEAREST);
    float m0_10 = 2 * (subnormal_f1 - shifted_11) + 1.1754943508222875e-38;
    float m11_21 = (shifted_11 - shifted_22) * 0.0009765625 + 1.1754943508222875e-38;
    float m22 = shifted_22 * 4.76837158203125e-07 + 1.1754943508222875e-38;

    float m22_31 = m22 + b23 * 5.605193857299268e-45 + b24 * 1.1210387714598537e-44 + b25 * 2.2420775429197073e-44 + b26 * 4.484155085839415e-44 + b27 * 8.96831017167883e-44 + b28 * 1.793662034335766e-43 + b29 * 3.587324068671532e-43 + b30 * 7.174648137343064e-43 + b31 * 1.4349296274686127e-42;
    float subnormal_f2 = d.f2 - 1.1754943508222875e-38;
    fesetround(FE_DOWNWARD);
    float shifted_1 = (subnormal_f2 / 2) * 2;
    float shifted_12 = (subnormal_f2 / 4096) * 4096;
    fesetround(FE_TONEAREST);

    float sm32 = subnormal_f2 - shifted_1;
    float m22_32 = m22_31 + sm32 * 2048;

    float m33_43 = subnormal_f2 - sm32 - shifted_12 + 1.1754943508222875e-38;
    float m44_51 = shifted_12 * 0.00048828125 + + 1.1754943508222875e-38;
    float m44_52 = m44_51 + 7.17464813734e-43;
    return (double_mantissa) { .m0_10 = m0_10, .m11_21 = m11_21, .m22_32 = m22_32, .m33_43 = m33_43, .m44_52 = m44_52 };
}

typedef struct { float exp; double_mantissa mantissa; } dec_double;

dec_double deconstruct(float2 d) {
    float2 exp = double_get_exp(d.f2);
    d.f2 = exp.f2;

    double_mantissa m = double_get_mantissa(d);
    return (dec_double) { .exp = exp.f1, .mantissa = m };
}

float2 reconstruct(dec_double a) {
    fesetround(FE_DOWNWARD);
    float sb0_10 = a.mantissa.m0_10 - 1.17549435082e-38;
    float sb11_21 = a.mantissa.m11_21 - 1.17549435082e-38;
    float sb22_32 = a.mantissa.m22_32 - 1.17549435082e-38;
    float sb_shift23 = (sb22_32 / 4) * 4;
    float sb22 = sb22_32 - sb_shift23;

    float sb_shift31 = (sb22_32 / 1024) * 1024;
    float sb_shift32 = (sb22_32 / 2048) * 2048;
    float sb31 = (sb_shift31 - sb_shift32) / 512;
    float sb23_30 = (sb_shift23 - sb_shift31) / 2;

    float f1_mantissa = sb0_10 / 2 + sb11_21 * 1024 + sb22 * 2097152;
    float f1_exp = (sb23_30 * 85070591730234615865843651857942052864.) * 4194304.;
    float sign = sb31 * 8.50706e+37 * 4194304.;

    fesetround(FE_TONEAREST);
    float f1;
    if (f1_exp == 0) {
        f1 = (1 - 2 * sign) * f1_mantissa;
    } else {
        f1 = (1 - 2 * sign) * powf(2, f1_exp - 128) * (powf(2, 127) * (f1_mantissa + 1.17549435082e-38));
    }

    fesetround(FE_DOWNWARD);
    float sb33_43 = a.mantissa.m33_43 - 1.17549435082e-38;
    float sb32_43 = sb33_43 * 2 + sb_shift32 / 1024;

    float sb44_52 = a.mantissa.m44_52 - 1.17549435082e-38;
    float sb44_51 = sb44_52 - 7.17464813734e-43;

    float f2_mantissa = sb32_43 / 2 + sb44_51 * 2048 + 1.46936793853e-39 * fmod(a.exp, 8.);
    float f2_exp = (a.exp - fmod(a.exp, 8)) / 8;

    fesetround(FE_TONEAREST);
    float f2;
    if (f2_exp == 0) {
        f2 = f2_mantissa;
    } else {
        f2 = powf(2, f2_exp - 128) * (powf(2, 127) * (f2_mantissa + 1.17549435082e-38));
    }

    return (float2) { .f1 = f1, .f2 = f2, };
}


double_mantissa shift1(double_mantissa a) {
    fesetround(FE_DOWNWARD);
    float sm0_10 = a.m0_10 - 1.1754943508222875e-38;
    float sm11_21 = a.m11_21 - 1.1754943508222875e-38;
    float sm22_32 = a.m22_32 - 1.1754943508222875e-38;
    float sm33_43 = a.m33_43 - 1.1754943508222875e-38;
    float sm44_52 = a.m44_52 - 1.1754943508222875e-38;

    float sm11 = sm11_21 - (sm11_21 / 4) * 4;
    float sm22 = sm22_32 - (sm22_32 / 4) * 4;
    float sm33 = sm33_43 - (sm33_43 / 4) * 4;
    float sm44 = sm44_52 - (sm44_52 / 4) * 4;

    a.m44_52 = (sm44_52 / 4) * 2 + 1.1754943508222875e-38;
    a.m33_43 = ((sm33_43 / 4) * 2 + sm44 * 1024) + 1.1754943508222875e-38;
    a.m22_32 = ((sm22_32 / 4) * 2 + sm33 * 1024) + 1.1754943508222875e-38;
    a.m11_21 = ((sm11_21 / 4) * 2 + sm22 * 1024) + 1.1754943508222875e-38;
    a.m0_10 = ((sm0_10 / 4) * 2 + sm11 * 1024) + 1.1754943508222875e-38;

    return a;
}

double_mantissa shift2(double_mantissa d) { return shift1(shift1(d)); }

double_mantissa shift4(double_mantissa d) { return shift2(shift2(d)); }

double_mantissa shift8(double_mantissa d) { return shift4(shift4(d)); }

double_mantissa shift16(double_mantissa d) { return shift8(shift8(d)); }

double_mantissa shift32(double_mantissa d) { return shift16(shift16(d)); }

double_mantissa shift_1(double_mantissa d) {
    double_mantissa shifted10 = shift8(shift2(d));

    double_mantissa shifted_1 = (double_mantissa) {
        .m0_10 = d.m0_10 * 2 - 1.1754943508222875e-38,
        .m11_21 = shifted10.m0_10,
        .m22_32 = shifted10.m11_21,
        .m33_43 = shifted10.m22_32,
        .m44_52 = shifted10.m33_43,
    };

    return shifted_1;
}

dec_double d_add(dec_double a, dec_double b) {
    if (a.exp > b.exp) {
        dec_double tmp = a;
        a = b;
        b = tmp;
    }

    float diff = b.exp - a.exp;

    if (diff > 52) { return b; }

    if (diff >= 32) {
        a.mantissa = shift32(a.mantissa);
        diff -= 32;
    }
    if (diff >= 16) {
        a.mantissa = shift16(a.mantissa);
        diff -= 16;
    }
    if (diff >= 8) {
        a.mantissa = shift8(a.mantissa);
        diff -= 8;
    }
    if (diff >= 4) {
        a.mantissa = shift4(a.mantissa);
        diff -= 4;
    }
    if (diff >= 2) {
        a.mantissa = shift2(a.mantissa);
        diff -= 2;
    }
    if (diff >= 1) {
        a.mantissa = shift1(a.mantissa);
        diff -= 1;
    }

    m_res s0_10 = m_add(a.mantissa.m0_10, b.mantissa.m0_10, 1.17549435082e-38);
    b.mantissa.m0_10 = s0_10.lo;

    m_res s11_21 = m_add(a.mantissa.m11_21, b.mantissa.m11_21, s0_10.hi);
    b.mantissa.m11_21 = s11_21.lo;

    m_res s22_32 = m_add(a.mantissa.m22_32, b.mantissa.m22_32, s11_21.hi);
    b.mantissa.m22_32 = s22_32.lo;

    m_res s33_43 = m_add(a.mantissa.m33_43, b.mantissa.m33_43, s22_32.hi);
    b.mantissa.m33_43 = s33_43.lo;

    float s44_52 = m_add(a.mantissa.m44_52, b.mantissa.m44_52, s33_43.hi).lo;
    float sub44_52 = s44_52 - 1.1754943508222875e-38;
    float sh = (sub44_52 / 1024) * 1024;

    b.mantissa.m44_52 = sub44_52 - sh + 1.1754943508222875e-38;

    if (sh != 0) {
        b.mantissa = shift1(b.mantissa);
        fesetround(FE_TONEAREST);
        b.mantissa.m44_52 += 7.17464813734e-43;
        b.exp += 1;
    }

    return b;
}

double_mantissa wd_add_b0(double_mantissa a, m_res b) {
    m_res b1 = m_add(a.m33_43, b.lo, 1.17549435082e-38);
    a.m33_43 = b1.lo;
    m_res b0 = m_add(a.m44_52, b.hi, b1.hi);
    a.m44_52 = b0.lo;
    return a;
}

double_mantissa wd_add_b1(double_mantissa a, m_res b) {
    m_res b2 = m_add(a.m22_32, b.lo, 1.17549435082e-38);
    a.m22_32 = b2.lo;
    m_res b1 = m_add(a.m33_43, b.hi, b2.hi);
    a.m33_43 = b1.lo;
    m_res b0 = m_add(a.m44_52, 1.17549435082e-38, b1.hi);
    a.m44_52 = b0.lo;

    return a;
}

double_mantissa wd_add_b2(double_mantissa a, m_res b) {
    m_res b3 = m_add(a.m11_21, b.lo, 1.17549435082e-38);
    a.m11_21 = b3.lo;
    m_res b2 = m_add(a.m22_32, b.hi, b3.hi);
    a.m22_32 = b2.lo;
    m_res b1 = m_add(a.m33_43, 1.17549435082e-38, b2.hi);
    a.m33_43 = b1.lo;
    m_res b0 = m_add(a.m44_52, 1.17549435082e-38, b1.hi);
    a.m44_52 = b0.lo;

    return a;
}

double_mantissa wd_add_b3(double_mantissa a, m_res b) {
    m_res b4 = m_add(a.m0_10, b.lo, 1.17549435082e-38);
    a.m0_10 = b4.lo;
    m_res b3 = m_add(a.m11_21, b.hi, b4.hi);
    a.m11_21 = b3.lo;
    m_res b2 = m_add(a.m22_32, 1.17549435082e-38, b3.hi);
    a.m22_32 = b2.lo;
    m_res b1 = m_add(a.m33_43, 1.17549435082e-38, b2.hi);
    a.m33_43 = b1.lo;
    m_res b0 = m_add(a.m44_52, 1.17549435082e-38, b1.hi);
    a.m44_52 = b0.lo;

    return a;
}

double_mantissa wd_add_b4(double_mantissa a, m_res b) {
    m_res b4 = m_add(a.m0_10, b.hi, 1.17549435082e-38);
    a.m0_10 = b4.lo;
    m_res b3 = m_add(a.m11_21, 1.17549435082e-38, b4.hi);
    a.m11_21 = b3.lo;
    m_res b2 = m_add(a.m22_32, 1.17549435082e-38, b3.hi);
    a.m22_32 = b2.lo;
    m_res b1 = m_add(a.m33_43, 1.17549435082e-38, b2.hi);
    a.m33_43 = b1.lo;
    m_res b0 = m_add(a.m44_52, 1.17549435082e-38, b1.hi);
    a.m44_52 = b0.lo;

    return a;
}


dec_double d_mul(dec_double a, dec_double b) {
    a.mantissa = shift_1(shift_1(a.mantissa));
    b.mantissa = shift_1(shift_1(b.mantissa));

    double_mantissa prod_man = {
        .m0_10 = 1.1754943508222875e-38,
        .m11_21 = 1.1754943508222875e-38,
        .m22_32 = 1.1754943508222875e-38,
        .m33_43 = 1.1754943508222875e-38,
        .m44_52 = 1.1754943508222875e-38,
    };

    m_res prod_00 = m_mul(a.mantissa.m44_52, b.mantissa.m44_52);
    prod_man = wd_add_b0(prod_man, prod_00);

    m_res prod_01 = m_mul(a.mantissa.m44_52, b.mantissa.m33_43);
    prod_man = wd_add_b1(prod_man, prod_01);

    m_res prod_10 = m_mul(a.mantissa.m33_43, b.mantissa.m44_52);
    prod_man = wd_add_b1(prod_man, prod_10);

    m_res prod_02 = m_mul(a.mantissa.m44_52, b.mantissa.m22_32);
    prod_man = wd_add_b2(prod_man, prod_02);

    m_res prod_11 = m_mul(a.mantissa.m33_43, b.mantissa.m33_43);
    prod_man = wd_add_b2(prod_man, prod_11);

    m_res prod_20 = m_mul(a.mantissa.m22_32, b.mantissa.m44_52);
    prod_man = wd_add_b2(prod_man, prod_20);

    m_res prod_03 = m_mul(a.mantissa.m44_52, b.mantissa.m11_21);
    prod_man = wd_add_b3(prod_man, prod_03);

    m_res prod_12 = m_mul(a.mantissa.m33_43, b.mantissa.m22_32);
    prod_man = wd_add_b3(prod_man, prod_12);

    m_res prod_21 = m_mul(a.mantissa.m22_32, b.mantissa.m33_43);
    prod_man = wd_add_b3(prod_man, prod_21);

    m_res prod_30 = m_mul(a.mantissa.m11_21, b.mantissa.m44_52);
    prod_man = wd_add_b3(prod_man, prod_30);

    m_res prod_04 = m_mul(a.mantissa.m44_52, b.mantissa.m0_10);
    prod_man = wd_add_b4(prod_man, prod_04);

    m_res prod_13 = m_mul(a.mantissa.m33_43, b.mantissa.m11_21);
    prod_man = wd_add_b4(prod_man, prod_13);

    m_res prod_22 = m_mul(a.mantissa.m22_32, b.mantissa.m22_32);
    prod_man = wd_add_b4(prod_man, prod_22);

    m_res prod_31 = m_mul(a.mantissa.m11_21, b.mantissa.m33_43);
    prod_man = wd_add_b4(prod_man, prod_31);

    m_res prod_40 = m_mul(a.mantissa.m0_10, b.mantissa.m44_52);
    prod_man = wd_add_b4(prod_man, prod_40);

    if (prod_man.m44_52 < 1.17578133675e-38) {
        return (dec_double) { .exp = a.exp + b.exp - 1023, .mantissa = shift1(prod_man) };
    } else {
        return (dec_double) { .exp = a.exp + b.exp - 1022, .mantissa = shift2(prod_man) };
    }
}

float2 fl2_sum(float2 a, float2 b) {
    return reconstruct(d_add(deconstruct(a), deconstruct(b)));
}

float2 fl2_mul(float2 a, float2 b) {
    return reconstruct(d_mul(deconstruct(a), deconstruct(b)));
}

float2 flentry(float2 *a, float2 *b, size_t len) {
    float2 accum = decompose(0.0);
    for (int i = 0; i < len; i++) {
        float2 x = a[i];
        float2 y = b[i];
        float2 prod = fl2_mul(x, y);
        accum = fl2_sum(accum, prod);
    }
    return accum;
}

double entry(double *a, double *b, size_t len) {
    return recompose(flentry((float2 *) a, (float2 *) b, len));
}

#include <stdio.h>
int main() {
    double a[] = {1., 2., 3.};
    double b[] = {3., 4., 5.};
    printf("%g\n", entry(a, b, 3)); // 26

    double c[] = {3.14159, 2.71828};
    double d[] = {1.41421, 1.61803};
    printf("%g\n", entry(c, d, 2)); // 8.84113
}

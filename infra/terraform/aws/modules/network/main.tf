locals {
  nat_gateway_subnet_indexes = var.enable_single_nat_gateway
    ? { for idx, subnet_id in aws_subnet.public : idx => subnet_id if idx == 0 }
    : { for idx, subnet_id in aws_subnet.public : idx => subnet_id }
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-vpc"
  })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-igw"
  })
}

resource "aws_subnet" "public" {
  for_each = { for index, cidr in var.public_subnet_cidrs : index => cidr }

  vpc_id                  = aws_vpc.this.id
  cidr_block              = each.value
  availability_zone       = var.availability_zones[tonumber(each.key)]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-public-${tonumber(each.key) + 1}"
    Tier = "public"
  })
}

resource "aws_subnet" "private" {
  for_each = { for index, cidr in var.private_subnet_cidrs : index => cidr }

  vpc_id            = aws_vpc.this.id
  cidr_block        = each.value
  availability_zone = var.availability_zones[tonumber(each.key)]

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-private-${tonumber(each.key) + 1}"
    Tier = "private"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_eip" "nat" {
  for_each = local.nat_gateway_subnet_indexes

  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-nat-eip-${tonumber(each.key) + 1}"
  })
}

resource "aws_nat_gateway" "this" {
  for_each = local.nat_gateway_subnet_indexes

  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = each.value

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-nat-${tonumber(each.key) + 1}"
  })

  depends_on = [aws_internet_gateway.this]
}

resource "aws_route_table" "private" {
  for_each = aws_subnet.private

  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[var.enable_single_nat_gateway ? "0" : each.key].id
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-private-rt-${tonumber(each.key) + 1}"
  })
}

resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private

  subnet_id      = each.value.id
  route_table_id = aws_route_table.private[each.key].id
}
